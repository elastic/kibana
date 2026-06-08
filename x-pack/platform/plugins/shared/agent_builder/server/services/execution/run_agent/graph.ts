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
} from '@kbn/agent-builder-genai-utils/langchain';
import type { ToolManager } from '@kbn/agent-builder-server/runner';
import type { ResolvedConfiguration } from './types';
import { convertError, isRecoverableError } from './utils/errors';
import type { PromptFactory } from './prompts';
import { getRandomThinkingMessage } from './i18n';
import { steps, tags, BACKGROUND_CHECK_CYCLE_INTERVAL } from './constants';
import type { BackgroundExecutionService } from './background_execution_service';
import type { StateType } from './state';
import { StateAnnotation } from './state';
import { processResearchResponse, processToolNodeResponse } from './action_utils';
import { createAnswerAgentStructured } from './answer_agent_structured';
import {
  errorAction,
  handoverAction,
  backgroundExecutionCompleteAction,
  proactiveContextAction,
  isAgentErrorAction,
  isHandoverAction,
  isStructuredAnswerAction,
  isToolCallAction,
  isToolPromptAction,
} from './actions';
import type { ProcessedConversation } from './utils/prepare_conversation';
import type { ProactiveRagSession } from './proactive_rag';
import { formatProactiveContext } from './proactive_rag';

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
  backgroundExecutionService,
  roundId,
  proactiveRagSession,
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
  backgroundExecutionService?: BackgroundExecutionService;
  roundId: string;
  proactiveRagSession?: ProactiveRagSession;
}) => {
  const init = async () => {
    return {};
  };

  const checkBackgroundWork = async (state: StateType) => {
    // Only check at the beginning (cycle 0) and every BACKGROUND_CHECK_CYCLE_INTERVAL cycles
    if (
      !backgroundExecutionService ||
      !backgroundExecutionService.hasPending() ||
      (state.currentCycle > 0 && state.currentCycle % BACKGROUND_CHECK_CYCLE_INTERVAL !== 0)
    ) {
      return {};
    }

    // Find the last tool call group ID for positioning the completion notice
    let lastToolCallGroupId: string | undefined;
    for (let i = state.mainActions.length - 1; i >= 0; i--) {
      const action = state.mainActions[i];
      if (isToolCallAction(action)) {
        lastToolCallGroupId = action.tool_call_group_id;
        break;
      }
    }

    const completions = await backgroundExecutionService.checkForCompletions({
      roundId,
      toolCallGroupId: lastToolCallGroupId,
    });

    return {
      mainActions: completions.map(backgroundExecutionCompleteAction),
    };
  };

  const injectProactiveContext = async (state: StateType) => {
    logger.info(`[ProactiveRAG:Graph] injectProactiveContext step called`);
    logger.info(`[ProactiveRAG:Graph]   hasSession=${!!proactiveRagSession}`);

    if (!proactiveRagSession) {
      logger.info(`[ProactiveRAG:Graph]   No session, returning empty`);
      return {};
    }

    const readyContext = proactiveRagSession.getReadyContext();
    logger.info(`[ProactiveRAG:Graph]   readyContext=${!!readyContext}`);

    if (!readyContext) {
      logger.info(`[ProactiveRAG:Graph]   No ready context, returning empty`);
      return {};
    }

    logger.info(
      `[ProactiveRAG:Graph]   Context id=${readyContext.id}, findings=${readyContext.findings.length}`
    );
    logger.info(
      `[ProactiveRAG:Graph]   Already injected IDs: [${
        state.injectedProactiveContextIds?.join(', ') ?? 'none'
      }]`
    );

    // Only inject each unique context once (dedupe by ID)
    if (state.injectedProactiveContextIds?.includes(readyContext.id)) {
      logger.info(`[ProactiveRAG:Graph]   Context ${readyContext.id} already injected, skipping`);
      return {};
    }

    proactiveRagSession.markInjected(readyContext.id);

    const formattedContent = formatProactiveContext(readyContext);

    logger.info(
      `[ProactiveRAG:Graph]   INJECTING context ${readyContext.id} with ${readyContext.findings.length} findings as action!`
    );

    return {
      mainActions: [proactiveContextAction(readyContext.id, formattedContent)],
      injectedProactiveContextIds: [readyContext.id],
    };
  };

  const researchAgent = async (state: StateType) => {
    const researcherModel = chatModel.bindTools(toolManager.list()).withConfig({
      tags: [tags.agent, tags.researchAgent],
    });

    if (state.mainActions.length === 0 && state.errorCount === 0) {
      events.emit(createReasoningEvent(getRandomThinkingMessage(), { transient: true }));
    }
    try {
      const mainPrompt = await promptFactory.getMainPrompt({
        cycleLimit: state.cycleLimit,
        actions: state.mainActions,
      });

      const response = await researcherModel.invoke(mainPrompt);

      const currentCycle = state.currentCycle + 1;
      const action = processResearchResponse(response, { cycle: currentCycle });

      return {
        mainActions: [action],
        currentCycle,
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
        if (structuredOutput) {
          return steps.prepareToAnswer;
        }
        throw createAgentExecutionError(
          `Agent exceeded its cycle budget of ${state.cycleLimit} without producing a final answer.`,
          ErrCodes.cycleLimitExceeded,
          {}
        );
      } else {
        return steps.executeTool;
      }
    } else if (isHandoverAction(lastAction)) {
      return structuredOutput ? steps.prepareToAnswer : steps.finalize;
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

    lastAction.tool_calls.forEach((toolCall) => toolManager.recordToolUse(toolCall.toolName));

    if (proactiveRagSession) {
      const delayMs = proactiveRagSession.getConfig().toolCallDelayMs;
      if (delayMs > 0) {
        logger.info(
          `[ProactiveRAG:Graph] executeTool - waiting ${delayMs}ms for proactive RAG to search`
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        logger.info(`[ProactiveRAG:Graph] executeTool - delay complete, proceeding with tool call`);
      }
    }

    const toolCallMessage = createToolCallMessage(lastAction.tool_calls, lastAction.message);
    const toolNodeResult = await toolNode.invoke([toolCallMessage], {});
    const actions = processToolNodeResponse(toolNodeResult, { cycle: state.currentCycle });

    if (proactiveRagSession) {
      logger.info(`[ProactiveRAG:Graph] executeTool - updating session with tool results`);

      const toolResultTexts = toolNodeResult
        .filter((msg): msg is BaseMessage & { content: string } => typeof msg.content === 'string')
        .map((msg) => msg.content)
        .filter((content) => content.length > 0);

      logger.info(
        `[ProactiveRAG:Graph] executeTool - found ${toolResultTexts.length} text results`
      );

      if (toolResultTexts.length > 0) {
        logger.info(
          `[ProactiveRAG:Graph] executeTool - result preview: ${toolResultTexts[0]?.substring(
            0,
            300
          )}...`
        );

        const emptyConversation = {
          id: '',
          agent_id: '',
          user: { username: '' },
          title: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          rounds: [],
        };
        proactiveRagSession.updateWithActions(emptyConversation, toolResultTexts);
      } else {
        logger.info(`[ProactiveRAG:Graph] executeTool - no text results to update with`);
      }
    } else {
      logger.info(`[ProactiveRAG:Graph] executeTool - no proactiveRagSession available`);
    }

    return {
      mainActions: actions,
    };
  };

  const executeToolEdge = async (state: StateType) => {
    const lastAction = state.mainActions[state.mainActions.length - 1];
    if (isToolPromptAction(lastAction)) {
      return steps.handleToolInterrupt;
    }
    return steps.checkBackgroundWork;
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
    } else if (isStructuredAnswerAction(lastAction)) {
      return steps.finalize;
    }

    // @ts-expect-error - lastAction.type is never because we cover all use cases.
    throw invalidState(`[answerAgentEdge] last action type was ${lastAction.type}}`);
  };

  const finalize = async (state: StateType) => {
    if (structuredOutput) {
      const answerAction = state.answerActions[state.answerActions.length - 1];
      if (isStructuredAnswerAction(answerAction)) {
        return { finalAnswer: answerAction.data };
      }
      throw invalidState(
        `[finalize] expected structured answer action, got ${answerAction.type} instead.`
      );
    }

    // Non-structured: the research agent's terminal HandoverAction carries the
    // user-facing answer.
    const lastMainAction = state.mainActions[state.mainActions.length - 1];
    if (isHandoverAction(lastMainAction)) {
      return { finalAnswer: lastMainAction.message };
    }
    throw invalidState(`[finalize] expected handover action, got ${lastMainAction.type} instead.`);
  };

  // note: the node names are used in the event convertion logic, they should *not* be changed
  const graphBuilder = new StateGraph(StateAnnotation)
    .addNode(steps.init, init)
    .addNode(steps.checkBackgroundWork, checkBackgroundWork)
    .addNode(steps.injectProactiveContext, injectProactiveContext)
    .addNode(steps.researchAgent, researchAgent)
    .addNode(steps.executeTool, executeTool)
    .addNode(steps.handleToolInterrupt, handleToolInterrupt)
    .addNode(steps.finalize, finalize)
    .addEdge(_START_, steps.init)
    .addEdge(steps.init, steps.checkBackgroundWork)
    .addEdge(steps.checkBackgroundWork, steps.injectProactiveContext)
    .addEdge(steps.injectProactiveContext, steps.researchAgent)
    .addConditionalEdges(steps.executeTool, executeToolEdge, {
      [steps.checkBackgroundWork]: steps.checkBackgroundWork,
      [steps.handleToolInterrupt]: steps.handleToolInterrupt,
    })
    .addEdge(steps.handleToolInterrupt, _END_)
    .addEdge(steps.finalize, _END_);

  if (structuredOutput) {
    graphBuilder
      .addNode(steps.prepareToAnswer, prepareToAnswer)
      .addNode(steps.answerAgent, answerAgentStructured)
      .addConditionalEdges(steps.researchAgent, researchAgentEdge, {
        [steps.researchAgent]: steps.researchAgent,
        [steps.executeTool]: steps.executeTool,
        [steps.prepareToAnswer]: steps.prepareToAnswer,
      })
      .addEdge(steps.prepareToAnswer, steps.answerAgent)
      .addConditionalEdges(steps.answerAgent, answerAgentEdge, {
        [steps.answerAgent]: steps.answerAgent,
        [steps.finalize]: steps.finalize,
      });
  } else {
    graphBuilder.addConditionalEdges(steps.researchAgent, researchAgentEdge, {
      [steps.researchAgent]: steps.researchAgent,
      [steps.executeTool]: steps.executeTool,
      [steps.finalize]: steps.finalize,
    });
  }

  return graphBuilder.compile();
};

const invalidState = (message: string) => {
  return createAgentExecutionError(message, ErrCodes.invalidState, {});
};
