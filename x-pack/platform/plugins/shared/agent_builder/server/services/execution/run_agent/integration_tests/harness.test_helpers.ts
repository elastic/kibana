/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Scenario harness for `runDefaultAgentMode`: the real runner, agent handler context, graph,
 * tool manager, attachment state and prompts run against an in-memory conversation and tool
 * registry; only the model is scripted and the Kibana core services are mocked. Run with:
 *
 *   node scripts/jest_integration --config x-pack/platform/plugins/shared/agent_builder/jest.integration.config.js \
 *     x-pack/platform/plugins/shared/agent_builder/server/services/execution/run_agent/integration_tests
 */

import { lastValueFrom, of } from 'rxjs';
import { MessageRole, type Message } from '@kbn/inference-common';
import type { ZodObject } from '@kbn/zod/v4';
import type {
  AgentConfiguration,
  ChatAgentEvent,
  Conversation,
  ConversationRound,
  ConverseInput,
} from '@kbn/agent-builder-common';
import {
  CONVERSATION_SCHEMA_VERSION,
  ToolType,
  createToolNotFoundError,
  isRoundCompleteEvent,
  roundUserMessageEventId,
} from '@kbn/agent-builder-common';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type {
  ToolHandlerContext,
  ToolHandlerReturn,
  ToolRegistry,
} from '@kbn/agent-builder-server';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import type {
  BuiltinToolDefinition,
  InternalToolDefinition,
} from '@kbn/agent-builder-server/tools';
import { createScopedRunnerDepsMock } from '../../../../test_utils/runner';
import { createEmptyConversation } from '../../../../test_utils/conversations';
import {
  createConversationStore,
  type ConversationStore,
} from '../../../../test_utils/conversation_store';
import {
  createScriptedChatModel,
  scriptedConnector,
  type ModelCall,
  type ScriptedChatModel,
  type ScriptedResponse,
} from '../../../../test_utils/scripted_chat_model';
import { AttachmentServiceImpl } from '../../../attachments/attachment_service';
import { AvailabilityCache } from '../../../common/availability_cache';
import { convertTool } from '../../../tools/builtin/converter';
import { getBuiltinToolType } from '../../../tools/tool_types/builtin';
import { createAgentHandlerContext } from '../../runner/run_agent';
import { RunnerManager } from '../../runner/runner';
import { createSkillsStore } from '../../runner/store/volumes/skills/skills_store';
import { createResultStore } from '../../runner/store/volumes/tool_results/tool_result_store';
import { createPromptManager } from '../../runner/utils/prompts';
import { createEmptyRunContext, forkContextForAgentRun } from '../../runner/utils/run_context';
import { createConversationStateManager } from '../../runner/utils/state_manager';
import { createToolManager } from '../../runner/utils/tool_manager';
import {
  appendRoundTerminated$,
  persistUserMessage,
  type ConversationWithOperation,
} from '../../utils/conversations';
import { runDefaultAgentMode } from '../run_chat_agent';

/** A tool a scenario provides: the same shape whether it is a registry tool or bound to an attachment. */
export interface ScenarioTool {
  id: string;
  description: string;
  schema: ZodObject<any>;
  handler: (
    params: any,
    context: ToolHandlerContext
  ) => ToolHandlerReturn | Promise<ToolHandlerReturn>;
}

/** An attachment type a scenario registers. */
export interface ScenarioAttachmentType {
  id: string;
  /** What the agent is told about the type (`getAgentDescription`). */
  description?: string;
  /** The registry tool ids the type declares (`getTools`). */
  tools?: string[];
  /** The tools bound to one attachment (`getBoundedTools`). */
  boundedTools?: (attachment: Attachment) => ScenarioTool[];
  /** The text the attachment renders as; its data as JSON by default. */
  representation?: (attachment: Attachment) => string;
}

export interface ScenarioOptions {
  /** Registry tools, listed by the tool provider; the agent's configuration selects them all. */
  tools?: ScenarioTool[];
  /** Registry tools the agent's configuration leaves out: reachable through an attachment type. */
  unselectedTools?: ScenarioTool[];
  attachmentTypes?: ScenarioAttachmentType[];
  agentConfiguration?: Partial<AgentConfiguration>;
  /** The conversation stored before the first turn; empty by default. */
  conversation?: Conversation;
}

export interface TurnResult {
  round: ConversationRound;
  /** The events the run emitted. */
  events: ChatAgentEvent[];
  /** The research calls of this turn. */
  calls: ModelCall[];
  /** The conversation as stored after the turn. */
  conversation: ConversationWithOperation;
}

export interface Scenario {
  model: ScriptedChatModel;
  store: ConversationStore;
  /** Runs one turn: stores the input, runs the agent on the stored conversation, stores the round. */
  turn: (input: string | ConverseInput, responses?: ScriptedResponse[]) => Promise<TurnResult>;
}

const author = { id: 'user-1', username: 'alice' };
const agentId = 'scenario-agent';
const spaceId = 'default';

/**
 * Asserts each call sends the previous call's system prompt and messages, with new messages only
 * appended, so the prompt cache prefix holds.
 */
export const expectAppendOnly = (calls: ModelCall[]): void => {
  calls.forEach((call, index) => {
    if (index === 0) {
      return;
    }
    const previous = calls[index - 1];
    expect(call.system).toEqual(previous.system);
    expect(call.messages.slice(0, previous.messages.length)).toEqual(previous.messages);
  });
};

const messageText = (message: Message): string => {
  switch (message.role) {
    case MessageRole.User:
      return typeof message.content === 'string'
        ? message.content
        : message.content
            .map((part) => (part.type === 'text' ? part.text : `[image ${part.source.mimeType}]`))
            .join('\n');
    case MessageRole.Assistant:
      return message.content ?? '';
    case MessageRole.Tool:
      return typeof message.response === 'string'
        ? message.response
        : JSON.stringify(message.response);
  }
};

/** The text of a call's system prompt and messages, for `toContain` checks. */
export const messagesText = (call: ModelCall): string =>
  [call.system ?? '', ...call.messages.map(messageText)].join('\n');

export const createScenario = (options: ScenarioOptions = {}): Scenario => {
  const model = createScriptedChatModel();
  const store = createConversationStore(
    options.conversation ??
      createEmptyConversation({
        id: 'conversation-1',
        agent_id: agentId,
        user: author,
        schema_version: CONVERSATION_SCHEMA_VERSION,
        events: [],
      })
  );
  const selectedTools = options.tools ?? [];
  const registryTools = [...selectedTools, ...(options.unselectedTools ?? [])];
  const agentConfiguration: AgentConfiguration = {
    instructions: '',
    tools: [{ tool_ids: selectedTools.map((tool) => tool.id) }],
    skill_ids: [],
    enable_elastic_capabilities: false,
    ...options.agentConfiguration,
  };
  const attachmentService = new AttachmentServiceImpl();
  for (const type of options.attachmentTypes ?? []) {
    // registered on the registry itself: `setup().registerType` only takes allow-listed ids
    attachmentService.attachmentTypeRegistry.register(toTypeDefinition(type));
  }
  let turnCount = 0;

  const turn: Scenario['turn'] = async (input, responses = []) => {
    model.respond(...responses);
    turnCount += 1;
    const roundId = `round-${turnCount}`;
    const receivedAt = new Date(Date.UTC(2026, 0, 1, 0, turnCount));
    const nextInput: ConverseInput = typeof input === 'string' ? { message: input } : input;

    // the message is stored on receipt, before the run reads the conversation
    await persistUserMessage({
      conversation: store.read(),
      conversationClient: store.client,
      eventId: roundUserMessageEventId(roundId),
      receivedAt,
      input: nextInput,
      author,
    });
    const received = store.read();

    // the runner's deps: Kibana core and plugin services mocked, everything of ours real
    const deps = createScopedRunnerDepsMock();
    const attachmentsStart = attachmentService.start({
      savedObjects: deps.savedObjects,
      spaces: deps.spaces,
    });
    const registry = createScenarioToolRegistry(registryTools, deps.request);
    jest.mocked(deps.modelProvider.getDefaultModel).mockResolvedValue({
      chatModel: model.chatModel,
      connector: scriptedConnector,
    } as any);
    jest.mocked(deps.conversationService.getScopedClient).mockResolvedValue(store.client as any);
    deps.toolsService.getToolDefinitions.mockReturnValue([getBuiltinToolType()]);
    deps.toolsService.getRegistry.mockResolvedValue(registry);
    const manager = new RunnerManager(
      {
        ...deps,
        toolManager: createToolManager(),
        attachmentsService: attachmentsStart,
        attachmentStateManager: attachmentsStart.createStateManager(received.attachments ?? []),
        resultStore: createResultStore({ conversation: received }),
        skillsStore: createSkillsStore({ skills: [] }),
        promptManager: createPromptManager(),
        stateManager: createConversationStateManager(received),
        agentConfiguration,
      },
      forkContextForAgentRun({
        parentContext: createEmptyRunContext(),
        agentId,
        conversationId: received.id,
      })
    );

    const events: ChatAgentEvent[] = [];
    const context = await createAgentHandlerContext({
      agentExecutionParams: {
        agentId,
        agentParams: { nextInput, conversation: received },
        onEvent: (event) => {
          events.push(event);
        },
      },
      manager,
    });

    const callsBefore = model.calls.length;
    const { round } = await runDefaultAgentMode(
      {
        nextInput,
        conversation: received,
        agentConfiguration,
        agentId,
        roundId,
        author,
        startTime: receivedAt,
      },
      context
    );

    const roundComplete = events.find(isRoundCompleteEvent);
    if (!roundComplete) {
      throw new Error('expected a round_complete event');
    }
    await lastValueFrom(
      appendRoundTerminated$({
        conversation: received,
        conversationClient: store.client,
        roundCompletedEvents$: of(roundComplete),
        releaseExecutionId: `exec-${turnCount}`,
      })
    );

    return {
      round,
      events,
      calls: model.calls.slice(callsBefore),
      conversation: store.read(),
    };
  };

  return { model, store, turn };
};

/** A scenario tool as a builtin tool registration, the shape the registry and attachments convert. */
const toRegistration = (tool: ScenarioTool): BuiltinToolDefinition => ({
  id: tool.id,
  type: ToolType.builtin,
  description: tool.description,
  tags: [],
  schema: tool.schema,
  handler: tool.handler,
  annotations: {
    title: tool.id,
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
});

/** A read-only registry over the scenario's tools, converted as the builtin provider would. */
const createScenarioToolRegistry = (
  tools: ScenarioTool[],
  request: ToolHandlerContext['request']
): ToolRegistry => {
  const definition = getBuiltinToolType();
  const cache = new AvailabilityCache();
  const internal = new Map<string, InternalToolDefinition>(
    tools.map((tool) => [
      tool.id,
      convertTool({
        tool: toRegistration(tool),
        definition,
        context: { request, spaceId },
        cache,
      }),
    ])
  );
  const unsupported = (operation: string) => async (): Promise<never> => {
    throw new Error(`${operation} is not supported by the scenario tool registry`);
  };
  return {
    has: async (toolId) => internal.has(toolId),
    get: async (toolId) => {
      const tool = internal.get(toolId);
      if (!tool) {
        throw createToolNotFoundError({ toolId });
      }
      return tool;
    },
    list: async () => internal.values().toArray(),
    create: unsupported('create'),
    update: unsupported('update'),
    delete: unsupported('delete'),
    execute: unsupported('execute'),
  };
};

const toTypeDefinition = (type: ScenarioAttachmentType): AttachmentTypeDefinition =>
  ({
    id: type.id,
    validate: (input: unknown) => ({ valid: true, data: input }),
    format: (attachment: Attachment) => ({
      getRepresentation: () => ({
        type: 'text',
        value: type.representation?.(attachment) ?? JSON.stringify(attachment.data),
      }),
      ...(type.boundedTools
        ? { getBoundedTools: () => type.boundedTools!(attachment).map(toRegistration) }
        : {}),
    }),
    getAgentDescription: () => type.description ?? `A ${type.id} attachment.`,
    getTools: () => type.tools ?? [],
  } as unknown as AttachmentTypeDefinition);
