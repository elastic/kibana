/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AgentExecutionMode,
  agentBuilderDefaultAgentId,
  ToolOrigin,
  type ConversationTemplate,
  type MetadataFieldValue,
} from '@kbn/agent-builder-common';
import type { AgentHandlerContext } from '@kbn/agent-builder-server';
import type { InternalBuiltinToolDefinition } from '@kbn/agent-builder-server/tools';
import type { ScopedRunner } from '@kbn/agent-builder-server/runner';
import { ToolManagerToolType } from '@kbn/agent-builder-server/runner';
import type { InternalSkillDefinition } from '@kbn/agent-builder-server/skills';
import { createSubagentTool } from './run_subagent';
import { createSendMessageTool } from './send_message';
import { createSleepTool } from './sleep';
import { createLoadSkillTool } from './load_skill';
import { createSearchRelevantSkillsTool } from './search_relevant_skills';
import { createAskUserQuestionTool } from './ask_user_question';
import { createReadFileTool } from './read_file';
import { createListFilesTool } from './list_files';
import { createBashTool } from './bash';
import {
  createDiscoverApisTool,
  createDescribeApiTool,
  createDescribeApiTypeTool,
  createExecuteApiTool,
} from './api';
import { createTodoTool } from '../../../tools/builtin/todo';
import { createSetConversationMetadataTool } from '../../../tools/builtin/set_conversation_metadata';
import { builtinToolToExecutable } from '../utils/select_tools';
import type { BackgroundExecutionService } from '../background_execution_service';
import type { SubagentTracker } from '../subagent_tracker';

export interface RegisterInternalToolsParams {
  context: AgentHandlerContext;
  agentId?: string;
  executionId?: string;
  abortSignal?: AbortSignal;
  backgroundExecutionService: BackgroundExecutionService;
  /** Callback to patch key/value updates into the active conversation's metadata. */
  updateConversationMetadata?: (updates: Record<string, MetadataFieldValue>) => Promise<unknown>;
  /** Active conversation template, used to validate values written by the LLM. */
  conversationTemplate?: ConversationTemplate;
  /** The agent's resolved skills, used by the `search_relevant_skills` tool. */
  filteredSkills: InternalSkillDefinition[];
  /**
   * Effective on/off for context-aware skill filtering (flag AND a dedicated fast model configured).
   * Gates registration of `search_relevant_skills` — not the raw `experimentalFeatures.relevantSkills`
   * flag, since the tool also relies on the fast model.
   */
  relevantSkillsEnabled: boolean;
  /** Parent conversation id — passed to `run_subagent` for persistent-mode creations. */
  parentConversationId?: string;
  /** Round-local persistent sub-agent tracker. */
  subagentTracker: SubagentTracker;
  /** Existence probe for stale-entry recovery in persistent `run_subagent`. */
  conversationExists: (conversationId: string) => Promise<boolean>;
}

/**
 * Registers internal builtin tools (sub-agent, sleep, load_skill) into the
 * active ToolManager, gated by their respective experimental-features flags
 * and execution-mode constraints.
 */
export const registerInternalTools = async ({
  context,
  agentId,
  executionId,
  abortSignal,
  backgroundExecutionService,
  updateConversationMetadata,
  conversationTemplate,
  filteredSkills,
  relevantSkillsEnabled,
  parentConversationId,
  subagentTracker,
  conversationExists,
}: RegisterInternalToolsParams): Promise<void> => {
  const {
    toolManager,
    runner,
    logger,
    modelProvider,
    experimentalFeatures,
    executionMode,
    interactivity,
    defaultConnectorId,
    subAgentExecutor,
    analyticsService,
    trackingService,
    filesystemService,
    bashService,
    todoStateManager,
    selfClient,
    parentExecutionId,
  } = context;

  // Sub-agent spawning is reserved for top-level, non-standalone runs
  const canSpawnSubagents = executionMode !== AgentExecutionMode.standalone && !parentExecutionId;
  const interactive = interactivity.enabled;

  const tools: Array<InternalBuiltinToolDefinition<any>> = [];

  // Filesystem — read_file and list_files are always on; bash is FF-gated.
  tools.push(createReadFileTool({ filesystemService }));
  tools.push(createListFilesTool({ filesystemService }));
  if (experimentalFeatures.bash && bashService) {
    tools.push(createBashTool({ bashService }));
  }

  // Todos — FF-gated.
  if (experimentalFeatures.todos) {
    tools.push(createTodoTool({ todoStateManager }));
  }

  // HTTP API introspection/invocation — FF-gated.
  if (experimentalFeatures.apiTools) {
    tools.push(createDiscoverApisTool());
    tools.push(createDescribeApiTool());
    tools.push(createDescribeApiTypeTool());
    tools.push(createExecuteApiTool({ selfClient }));
  }

  // run_subagent + send_message + sleep — experimental; reserved for top-level
  // runs (see `canSpawnSubagents` above for why sub-agents can't nest-spawn).
  if (experimentalFeatures.subagents && canSpawnSubagents) {
    tools.push(
      createSubagentTool({
        agentId: agentId ?? agentBuilderDefaultAgentId,
        executionId: executionId ?? '',
        connectorId: defaultConnectorId,
        subAgentExecutor,
        abortSignal,
        backgroundExecutionService,
        parentConversationId,
        subagentTracker,
        conversationExists,
      })
    );
    tools.push(
      createSendMessageTool({
        agentId: agentId ?? agentBuilderDefaultAgentId,
        executionId: executionId ?? '',
        subAgentExecutor,
        abortSignal,
        backgroundExecutionService,
        subagentTracker,
      })
    );
    tools.push(createSleepTool());
  }

  // ask_user_question — not available in standalone mode.
  if (interactive) {
    tools.push(createAskUserQuestionTool());
  }

  // load_skill — gated on the skills feature only.
  if (experimentalFeatures.skills) {
    tools.push(createLoadSkillTool({ analyticsService, trackingService }));
  }

  // set_conversation_metadata — only when both callback and template are wired.
  if (updateConversationMetadata && conversationTemplate) {
    tools.push(
      createSetConversationMetadataTool({
        updateConversationMetadata,
        template: conversationTemplate,
      })
    );
  }

  // search_relevant_skills — context-aware skill discovery. Gated on the effective enablement
  // (flag AND a dedicated fast model), since the tool relies on the fast model too.
  if (relevantSkillsEnabled) {
    tools.push(
      createSearchRelevantSkillsTool({ modelProvider, filteredSkills, logger, abortSignal })
    );
  }

  await toolManager.addTools({
    type: ToolManagerToolType.executable,
    tools: tools.map((tool) => ({
      ...builtinToolToExecutable({ tool, runner: runner as ScopedRunner }),
      origin: ToolOrigin.internal,
    })),
    logger,
  });
};
