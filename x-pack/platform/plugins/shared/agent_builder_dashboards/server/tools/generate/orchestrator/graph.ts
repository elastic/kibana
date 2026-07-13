/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StateGraph } from '@langchain/langgraph';
import { v4 as uuidv4 } from 'uuid';
import {
  createUserMessage,
  extractTextContent,
  extractToolCalls,
} from '@kbn/agent-builder-genai-utils/langchain';
import type { Logger } from '@kbn/core/server';
import type { ScopedModel } from '@kbn/agent-builder-server';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { TrackedPanelFailure } from '../core/utils';
import { getErrorMessage, isVisualizationGenerationFailure } from '../core/utils';
import type { ResolvePanelContent } from '../core/operations/panels';
import { summarizeDashboard } from '../summarize_dashboard';
import { StateAnnotation, type StateType } from './state';
import {
  buildBoundTools,
  dispatchToolCalls,
  getDashboardGenTools,
  isEditToolName,
} from './tools/tools';
import { buildMessagesFromActions } from './prompts';
import { agentStepAction, findLastAgentStep, isAgentStepAction, toolResultAction } from './actions';
import type { Action } from './types';

const countAgentTurns = (state: StateType): number =>
  state.actions.filter(isAgentStepAction).length;

const FINAL_RESPONSE_INSTRUCTION = `The tool-call budget is exhausted. Do not call any tools.
Return the final natural-language response now based on the completed work and tool results.
If critique_dashboard was used, include the mandatory "Material decisions" section with reasons
for additions, removals, replacements, existing-query changes, skipped work, and unresolved
failures. Summarize cosmetic changes collectively.`;

export interface CreateGraphArgs {
  model: ScopedModel;
  logger: Logger;
  resolvePanelContent?: ResolvePanelContent;
  /** For the explore_data lookup tool. */
  esClient?: IScopedClusterClient;
  /** Enables the read-only critique tool for existing-dashboard workflows. */
  includeCritique?: boolean;
}

export const createDashboardOrchestratorGraph = ({
  model,
  logger,
  resolvePanelContent,
  esClient,
  includeCritique = false,
}: CreateGraphArgs) => {
  const toolDefinitions = getDashboardGenTools({ includeCritique });
  const tools = buildBoundTools(toolDefinitions);
  const modelWithTools = model.chatModel.bindTools(tools);
  const dispatchDeps = { logger, resolvePanelContent, esClient, model };

  const agentNode = async (state: StateType): Promise<Partial<StateType>> => {
    const messages = buildMessagesFromActions(state);
    const aiMessage = await modelWithTools.invoke(messages);

    return {
      actions: [
        agentStepAction({
          toolCalls: extractToolCalls(aiMessage),
          text: extractTextContent(aiMessage),
        }),
      ],
    };
  };

  const branchAfterAgent = (state: StateType): 'tools' | 'finalize' => {
    const lastAgentStep = findLastAgentStep(state.actions);
    return lastAgentStep && lastAgentStep.toolCalls.length > 0 ? 'tools' : 'finalize';
  };

  // Hard turn bound: after dispatching the current turn's tools, drain to the
  // final result instead of invoking the model again, so the caller always gets a
  // best-effort result instead of a recursion error.
  const branchAfterTools = (state: StateType): 'agent' | 'finalize' => {
    return countAgentTurns(state) >= state.maxAgentTurns ? 'finalize' : 'agent';
  };

  const toolsNode = async (state: StateType): Promise<Partial<StateType>> => {
    const lastAgentStep = findLastAgentStep(state.actions);
    if (!lastAgentStep) {
      return {};
    }

    // Batch dispatch: panel content for the whole turn resolves in parallel;
    // operations apply sequentially, each call seeing the previous payload.
    const { dashboard, results } = await dispatchToolCalls(
      { dashboard: state.dashboard, request: state.request },
      lastAgentStep.toolCalls,
      dispatchDeps,
      toolDefinitions
    );

    const newActions: Action[] = [];
    const activeFailures = { ...state.activeFailures };
    let threadedDashboard = state.dashboard;

    lastAgentStep.toolCalls.forEach((call, callIndex) => {
      const result = results[callIndex];
      if (result.dashboard !== undefined) {
        threadedDashboard = result.dashboard;
      }
      for (const failureId of result.resolvedFailureIds ?? []) {
        delete activeFailures[failureId];
      }

      const toolFailures = (result.failures ?? []).map((failure) => {
        if (!isVisualizationGenerationFailure(failure)) {
          return failure;
        }
        const trackedFailure: TrackedPanelFailure = {
          ...failure,
          failureId: failure.failureId ?? uuidv4(),
        };
        activeFailures[trackedFailure.failureId] = trackedFailure;
        return trackedFailure;
      });

      newActions.push(
        toolResultAction({
          toolCallId: call.toolCallId,
          name: call.toolName,
          success: result.message.success,
          data: result.message.data,
          error: result.message.error,
          // Surface the current compact summary on every mutating call —
          // including failed ones — so the LLM always sees the state it is
          // working against (workflow-gen attaches currentYaml the same way).
          dashboardSummary: isEditToolName(call.toolName)
            ? summarizeDashboard(threadedDashboard)
            : undefined,
          failures: toolFailures,
        })
      );
    });

    return {
      dashboard,
      activeFailures,
      actions: newActions,
    };
  };

  const finalizeNode = async (state: StateType): Promise<Partial<StateType>> => {
    const lastAgentStep = findLastAgentStep(state.actions);
    if (!lastAgentStep || lastAgentStep.toolCalls.length === 0) {
      return {};
    }

    // The hard bound may be reached immediately after useful tool work. Give
    // the unbound model one text-only drain turn so the caller still receives
    // the final summary/material decisions instead of the empty tool-call turn.
    try {
      const aiMessage = await model.chatModel.invoke([
        ...buildMessagesFromActions(state),
        createUserMessage(FINAL_RESPONSE_INSTRUCTION),
      ]);

      return {
        actions: [
          agentStepAction({
            toolCalls: [],
            text: extractTextContent(aiMessage),
          }),
        ],
      };
    } catch (error) {
      logger.warn(`Failed to generate the final dashboard summary: ${getErrorMessage(error)}`);
      return {
        actions: [
          agentStepAction({
            toolCalls: [],
            text: 'Dashboard changes were applied, but the final authoring summary could not be generated.',
          }),
        ],
      };
    }
  };

  return new StateGraph(StateAnnotation)
    .addNode('agent', agentNode)
    .addNode('tools', toolsNode)
    .addNode('finalize', finalizeNode)
    .addEdge('__start__', 'agent')
    .addConditionalEdges('agent', branchAfterAgent, {
      tools: 'tools',
      finalize: 'finalize',
    })
    .addConditionalEdges('tools', branchAfterTools, {
      agent: 'agent',
      finalize: 'finalize',
    })
    .addEdge('finalize', '__end__')
    .compile();
};
