/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { END as _END_, START as _START_, StateGraph } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import type { BaseMessage } from '@langchain/core/messages';
import type { Logger } from '@kbn/core/server';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import type { ResolvedAgentCapabilities } from '@kbn/agent-builder-common';
import { AgentExecutionErrorCode as ErrCodes } from '@kbn/agent-builder-common/agents';
import { createAgentExecutionError } from '@kbn/agent-builder-common/base/errors';
import type { AgentEventEmitter } from '@kbn/agent-builder-server';
import {
  createReasoningEvent,
  createToolCallMessage,
  sanitizeToolId,
} from '@kbn/agent-builder-genai-utils/langchain';
import { memoryTools } from '@kbn/agent-builder-common';
import type { ToolManager } from '@kbn/agent-builder-server/runner';
import type { ResolvedConfiguration } from './types';
import { convertError, isRecoverableError } from './utils/errors';
import type { PromptFactory } from './prompts';
import { getRandomAnsweringMessage, getRandomThinkingMessage } from './i18n';
import { steps, tags } from './constants';
import type { StateType } from './state';
import { StateAnnotation } from './state';
import {
  processAnswerResponse,
  processResearchResponse,
  processToolNodeResponse,
} from './action_utils';
import { createAnswerAgentStructured } from './answer_agent_structured';
import {
  errorAction,
  executeToolAction,
  handoverAction,
  isAgentErrorAction,
  isAnswerAction,
  isHandoverAction,
  isStructuredAnswerAction,
  isToolCallAction,
  isToolPromptAction,
} from './actions';
import type { ProcessedConversation } from './utils/prepare_conversation';

// number of successive recoverable errors we try to recover from before throwing
const MAX_ERROR_COUNT = 2;

export const createAgentGraph = ({
  chatModel,
  toolManager,
  configuration,
  capabilities,
  logger,
  events,
  structuredOutput = false,
  outputSchema,
  processedConversation,
  promptFactory,
}: {
  chatModel: InferenceChatModel;
  toolManager: ToolManager;
  capabilities: ResolvedAgentCapabilities;
  configuration: ResolvedConfiguration;
  logger: Logger;
  events: AgentEventEmitter;
  structuredOutput?: boolean;
  outputSchema?: Record<string, unknown>;
  processedConversation: ProcessedConversation;
  promptFactory: PromptFactory;
}) => {
  const init = async () => {
    return {};
  };

  const researchAgent = async (state: StateType) => {
    const researcherModel = chatModel.bindTools(toolManager.list()).withConfig({
      tags: [tags.agent, tags.researchAgent],
    });

    if (state.mainActions.length === 0 && state.errorCount === 0) {
      events.emit(createReasoningEvent(getRandomThinkingMessage(), { transient: true }));
    }
    try {
      const response = await researcherModel.invoke(
        await promptFactory.getMainPrompt({
          actions: state.mainActions,
        })
      );

      const action = processResearchResponse(response);

      return {
        mainActions: [action],
        currentCycle: state.currentCycle + 1,
        errorCount: 0,
      };
    } catch (error) {
      const executionError = convertError(error);
      if (isRecoverableError(executionError)) {
        return {
          mainActions: [errorAction(executionError)],
          errorCount: state.errorCount + 1,
        };
      } else {
        throw executionError;
      }
    }
  };

  const researchAgentEdge = async (state: StateType) => {
    const lastAction = state.mainActions[state.mainActions.length - 1];

    if (isAgentErrorAction(lastAction)) {
      if (state.errorCount <= MAX_ERROR_COUNT) {
        return steps.researchAgent;
      } else {
        // max error count reached, stop execution by throwing
        throw lastAction.error;
      }
    } else if (isToolCallAction(lastAction)) {
      const maxCycleReached = state.currentCycle > state.cycleLimit;
      if (maxCycleReached) {
        return steps.prepareToAnswer;
      } else {
        return steps.executeTool;
      }
    } else if (isHandoverAction(lastAction)) {
      return steps.prepareToAnswer;
    }

    throw invalidState(`[researchAgentEdge] last action type was ${lastAction.type}}`);
  };

  const executeTool = async (state: StateType) => {
    const toolNode = new ToolNode<BaseMessage[]>(toolManager.list());

    const lastAction = state.mainActions[state.mainActions.length - 1];
    if (!isToolCallAction(lastAction)) {
      throw invalidState(
        `[executeTool] expected last action to be "tool_call" action, got "${lastAction.type}"`
      );
    }

    const sanitizedCheckpoint = sanitizeToolId(memoryTools.checkpoint);
    const sanitizedRemember = sanitizeToolId(memoryTools.remember);
    const sanitizedReinforce = sanitizeToolId(memoryTools.reinforce);

    // Check if memory system is enabled (tools are registered)
    const memoryEnabled = toolManager.list().some((t) => t.name === sanitizedCheckpoint);

    const isMemoryTool = (name: string) =>
      name === sanitizedCheckpoint ||
      name === sanitizedRemember ||
      name === sanitizedReinforce;

    const hasCheckpoint = lastAction.tool_calls.some(
      (tc) => tc.toolName === sanitizedCheckpoint
    );
    const hasNonMemoryTools = lastAction.tool_calls.some((tc) => !isMemoryTool(tc.toolName));

    // Guardrail: if the agent calls non-memory tools without checkpoint(),
    // reject the call and remind it to include checkpoint.
    // Only enforced when memory system is enabled.
    if (memoryEnabled && hasNonMemoryTools && !hasCheckpoint) {
      return {
        mainActions: [
          executeToolAction(
            lastAction.tool_calls.map((tc) => ({
              toolCallId: tc.toolCallId,
              content:
                'Error: You must call memory.checkpoint alongside any tool call. ' +
                'Please retry by calling memory.checkpoint (with goal, missing_info, next_tool, query_hint, final=false) ' +
                'together with your intended tool call.',
            }))
          ),
        ],
      };
    }

    lastAction.tool_calls.forEach((toolCall) => toolManager.recordToolUse(toolCall.toolName));

    const checkpointCalls = lastAction.tool_calls.filter(
      (tc) => tc.toolName === sanitizedCheckpoint
    );
    const otherCalls = lastAction.tool_calls.filter(
      (tc) => tc.toolName !== sanitizedCheckpoint
    );

    // When checkpoint is called alongside other tools, run them concurrently
    // but don't block on checkpoint — if it's still running when the main tools
    // finish, return a minimal placeholder so we add zero latency.
    if (checkpointCalls.length > 0 && otherCalls.length > 0) {
      const checkpointMsg = createToolCallMessage(checkpointCalls);
      const mainMsg = createToolCallMessage(otherCalls, lastAction.message);

      const checkpointPromise = toolNode
        .invoke([checkpointMsg], {})
        .catch((err: Error) => {
          logger.warn(`[executeTool] checkpoint failed (non-blocking): ${err.message}`);
          return null;
        });

      const mainResult = await toolNode.invoke([mainMsg], {});

      // Check if checkpoint finished while we waited for the main tools
      const settled = await Promise.race([
        checkpointPromise.then((r) => ({ done: true as const, result: r })),
        Promise.resolve({ done: false as const, result: null }),
      ]);

      const mainActions = processToolNodeResponse(mainResult);

      if (settled.done && settled.result) {
        const checkpointActions = processToolNodeResponse(settled.result);
        return { mainActions: [...checkpointActions, ...mainActions] };
      }

      // Checkpoint still running — return a placeholder tool result so the
      // model doesn't error on a missing response for the tool call it made.
      // The checkpoint will continue in background and populate ActiveMemorySet.
      // Note: content must start with "Error:" so convert_graph_events.ts
      // handles artifact-less tool results gracefully.
      const placeholderAction = executeToolAction(
        checkpointCalls.map((tc) => ({
          toolCallId: tc.toolCallId,
          content:
            'Error: Memory checkpoint is still retrieving — no memories available yet. ' +
            'Proceeding without memory context for this step.',
        }))
      );
      return { mainActions: [placeholderAction, ...mainActions] };
    }

    // Default path: no special handling needed
    const toolCallMessage = createToolCallMessage(lastAction.tool_calls, lastAction.message);
    const toolNodeResult = await toolNode.invoke([toolCallMessage], {});
    const actions = processToolNodeResponse(toolNodeResult);

    return {
      mainActions: actions,
    };
  };

  const executeToolEdge = async (state: StateType) => {
    const lastAction = state.mainActions[state.mainActions.length - 1];
    if (isToolPromptAction(lastAction)) {
      return steps.handleToolInterrupt;
    }
    return steps.researchAgent;
  };

  const handleToolInterrupt = async (state: StateType) => {
    const lastAction = state.mainActions[state.mainActions.length - 1];
    if (!isToolPromptAction(lastAction)) {
      throw invalidState(`[handleToolInterrupt] last action type was ${lastAction.type}}`);
    }
    return {
      interrupted: true,
      prompts: lastAction.prompts.map((entry) => entry.prompt),
    };
  };

  const prepareToAnswer = async (state: StateType) => {
    const lastAction = state.mainActions[state.mainActions.length - 1];
    const maxCycleReached = state.currentCycle > state.cycleLimit;

    if (maxCycleReached && !isHandoverAction(lastAction)) {
      return {
        mainActions: [handoverAction('', true)],
      };
    } else {
      return {};
    }
  };

  const answeringModel = chatModel.withConfig({
    tags: [tags.agent, tags.answerAgent],
  });

  const answerAgent = async (state: StateType) => {
    if (state.answerActions.length === 0 && state.errorCount === 0) {
      events.emit(createReasoningEvent(getRandomAnsweringMessage(), { transient: true }));
    }
    try {
      const response = await answeringModel.invoke(
        await promptFactory.getAnswerPrompt({
          actions: state.mainActions,
          answerActions: state.answerActions,
        })
      );

      const action = processAnswerResponse(response);

      return {
        answerActions: [action],
        errorCount: 0,
      };
    } catch (error) {
      const executionError = convertError(error);
      if (isRecoverableError(executionError)) {
        return {
          answerActions: [errorAction(executionError)],
          errorCount: state.errorCount + 1,
        };
      } else {
        throw executionError;
      }
    }
  };

  const answerAgentStructured = createAnswerAgentStructured({
    chatModel,
    promptFactory,
    events,
    outputSchema,
    logger,
  });

  const answerAgentEdge = async (state: StateType) => {
    const lastAction = state.answerActions[state.answerActions.length - 1];

    if (isAgentErrorAction(lastAction)) {
      if (state.errorCount <= MAX_ERROR_COUNT) {
        return steps.answerAgent;
      } else {
        // max error count reached, stop execution by throwing
        throw lastAction.error;
      }
    } else if (isAnswerAction(lastAction) || isStructuredAnswerAction(lastAction)) {
      return steps.finalize;
    }

    // @ts-expect-error - lastAction.type is never because we cover all use cases.
    throw invalidState(`[answerAgentEdge] last action type was ${lastAction.type}}`);
  };

  const finalize = async (state: StateType) => {
    const answerAction = state.answerActions[state.answerActions.length - 1];
    if (isStructuredAnswerAction(answerAction)) {
      return {
        finalAnswer: answerAction.data,
      };
    } else if (isAnswerAction(answerAction)) {
      return {
        finalAnswer: answerAction.message,
      };
    } else {
      throw invalidState(`[finalize] expect answer action, got ${answerAction.type} instead.`);
    }
  };

  const selectedAnswerAgent = structuredOutput ? answerAgentStructured : answerAgent;

  // note: the node names are used in the event convertion logic, they should *not* be changed
  const graph = new StateGraph(StateAnnotation)
    // nodes
    .addNode(steps.init, init)
    .addNode(steps.researchAgent, researchAgent)
    .addNode(steps.executeTool, executeTool)
    .addNode(steps.handleToolInterrupt, handleToolInterrupt)
    .addNode(steps.prepareToAnswer, prepareToAnswer)
    .addNode(steps.answerAgent, selectedAnswerAgent)
    .addNode(steps.finalize, finalize)
    // edges
    .addEdge(_START_, steps.init)
    .addEdge(steps.init, steps.researchAgent)
    .addConditionalEdges(steps.researchAgent, researchAgentEdge, {
      [steps.researchAgent]: steps.researchAgent,
      [steps.executeTool]: steps.executeTool,
      [steps.prepareToAnswer]: steps.prepareToAnswer,
    })
    .addConditionalEdges(steps.executeTool, executeToolEdge, {
      [steps.researchAgent]: steps.researchAgent,
      [steps.handleToolInterrupt]: steps.handleToolInterrupt,
    })
    .addEdge(steps.handleToolInterrupt, _END_)
    .addEdge(steps.prepareToAnswer, steps.answerAgent)
    .addConditionalEdges(steps.answerAgent, answerAgentEdge, {
      [steps.answerAgent]: steps.answerAgent,
      [steps.finalize]: steps.finalize,
    })
    .addEdge(steps.finalize, _END_)
    .compile();

  return graph;
};

const invalidState = (message: string) => {
  return createAgentExecutionError(message, ErrCodes.invalidState, {});
};
