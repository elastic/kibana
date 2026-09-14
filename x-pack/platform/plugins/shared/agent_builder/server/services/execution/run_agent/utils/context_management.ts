/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChatCompleteCacheControl, InferenceConnector } from '@kbn/inference-common';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import type { SubstitutionStepData, ToolCallWithResult } from '@kbn/agent-builder-common';
import { ChatEventType, TimelineEventType, isToolCallStep } from '@kbn/agent-builder-common';
import { AgentExecutionErrorCode as ErrCodes } from '@kbn/agent-builder-common/agents';
import { createAgentExecutionError } from '@kbn/agent-builder-common/base/errors';
import type { AgentEventEmitter } from '@kbn/agent-builder-server';
import {
  COMPACTION_TAIL_HARD_CAP_TOKENS,
  COMPACTION_TAIL_HARD_CAP_TOKENS_REACTIVE,
  CONTEXT_MANAGEMENT_COOLDOWN_CYCLES,
  INTRA_ROUND_COMPACTION_FRACTION,
  INTRA_ROUND_SUBSTITUTION_FRACTION,
  INTRA_ROUND_SUBSTITUTION_MAX_TOKENS,
  SUBST_INTRA_ROUND_THRESHOLD,
  SUBST_ROUND_START_THRESHOLD_COLD,
  SUBST_ROUND_START_THRESHOLD_HOT,
} from '../constants';
import { isContextLengthErrorAction, substitutionAction } from '../actions';
import type { CompactionCoverage, StateType } from '../state';
import type { ProcessedConversation } from './prepare_conversation';
import { sliceTimelineAfterEvent, type ProcessedTimelineEvent } from './context_timeline';
import { computeCacheState } from './cache_state';
import { getContextWindow } from './context_budget';
import { compactContext } from './conversation_compactor';
import { collectSubstitutionMarks, selectSubstitutionCandidates } from './filestore_substitution';
import { reconstructInFlightToolCalls, type VisibleContextDeps } from './visible_context';

export interface PreviousRoundInfo {
  terminatedAt?: string;
  connectorId?: string;
  lastCallInputTokens?: number;
}

export interface ContextManagementDeps extends VisibleContextDeps {
  conversation: ProcessedConversation;
  cycleLimit: number;
  chatModel: InferenceChatModel;
  connector: InferenceConnector;
  cacheControl?: ChatCompleteCacheControl;
  events: AgentEventEmitter;
  abortSignal?: AbortSignal;
  previousRound?: PreviousRoundInfo;
}

const visibleTimelineToolCalls = (
  timeline: ProcessedTimelineEvent[],
  coverage?: CompactionCoverage
): ToolCallWithResult[] => {
  const visible =
    coverage === undefined
      ? timeline
      : 'eventId' in coverage
      ? sliceTimelineAfterEvent(timeline, coverage.eventId)
      : [];
  return visible.flatMap((event) =>
    event.type === TimelineEventType.executionStep && isToolCallStep(event.data.step)
      ? [event.data.step]
      : []
  );
};

/**
 * Runs at the top of every cycle. Three modes:
 * - forced (last action is a context-length error): compact with the reactive tail cap;
 * - round start (cycle 0): compact from the previous round's last-call usage, else cache-aware
 *   substitution over previous rounds;
 * - proactive (cycle N > 0): every cycle, unless in cooldown after an action, compare the last
 *   call's input tokens to the window-relative thresholds; compaction wins over substitution.
 */
export const createContextManagementNode = (deps: ContextManagementDeps) => {
  const contextWindow = getContextWindow(deps.connector);
  const compactionThreshold = INTRA_ROUND_COMPACTION_FRACTION * contextWindow;
  const substitutionThreshold = Math.min(
    INTRA_ROUND_SUBSTITUTION_FRACTION * contextWindow,
    INTRA_ROUND_SUBSTITUTION_MAX_TOKENS
  );

  const compact = async (
    state: StateType,
    tailCapTokens: number
  ): Promise<Partial<StateType> | undefined> => {
    deps.events.emit({
      type: ChatEventType.compactionStarted,
      data: { token_count_before: state.lastCallUsage?.inputTokens ?? 0 },
    });
    const result = await compactContext(
      {
        conversation: deps.conversation,
        actions: state.mainActions,
        cycleLimit: deps.cycleLimit,
        existingSummary: state.compactionSummary,
        existingCoverage: state.compactionCoverage,
        tailCapTokens,
      },
      deps
    );
    if (!result) {
      return undefined;
    }
    deps.events.emit({
      type: ChatEventType.compactionCompleted,
      data: {
        token_count_before: result.tokensBefore,
        token_count_after: result.tokensAfter,
        summarized_cycle_count: result.summarizedCycleCount,
      },
    });
    return {
      compactionSummary: result.summary,
      compactionCoverage: result.coverage,
      lastContextActionCycle: state.currentCycle,
    };
  };

  const substitute = async (
    state: StateType,
    toolCalls: ToolCallWithResult[],
    thresholdTokens: number,
    data: Omit<SubstitutionStepData, 'substituted_tool_call_ids'>
  ): Promise<Partial<StateType>> => {
    const alreadyMarked = collectSubstitutionMarks({
      timeline: deps.conversation.timeline,
      actions: state.mainActions,
    });
    const ids = await selectSubstitutionCandidates({
      toolCalls,
      resultStore: deps.resultStore,
      thresholdTokens,
      alreadyMarked,
    });
    if (ids.length === 0) {
      return {};
    }
    return {
      mainActions: [substitutionAction({ ...data, substituted_tool_call_ids: ids })],
      lastContextActionCycle: state.currentCycle,
    };
  };

  return async (state: StateType): Promise<Partial<StateType>> => {
    const lastAction = state.mainActions[state.mainActions.length - 1];

    if (lastAction && isContextLengthErrorAction(lastAction)) {
      const update = await compact(state, COMPACTION_TAIL_HARD_CAP_TOKENS_REACTIVE);
      if (!update) {
        throw createAgentExecutionError(
          'Context length exceeded and no history is left to compact',
          ErrCodes.contextLengthExceeded,
          {}
        );
      }
      return update;
    }

    if (state.currentCycle === 0) {
      const hint = deps.previousRound?.lastCallInputTokens;
      if (hint !== undefined && hint > compactionThreshold) {
        return (await compact(state, COMPACTION_TAIL_HARD_CAP_TOKENS)) ?? {};
      }
      const cacheState = computeCacheState({
        lastTerminatedAt: deps.previousRound?.terminatedAt,
        lastConnectorId: deps.previousRound?.connectorId,
        connectorId: deps.connector.connectorId,
        cacheControl: deps.cacheControl,
      });
      return substitute(
        state,
        visibleTimelineToolCalls(deps.conversation.timeline, state.compactionCoverage),
        cacheState === 'cold' ? SUBST_ROUND_START_THRESHOLD_COLD : SUBST_ROUND_START_THRESHOLD_HOT,
        { trigger: 'round_start', reason: cacheState === 'cold' ? 'cache_cold' : 'cache_hot' }
      );
    }

    if (state.currentCycle - state.lastContextActionCycle < CONTEXT_MANAGEMENT_COOLDOWN_CYCLES) {
      return {};
    }
    const inputTokens = state.lastCallUsage?.inputTokens;
    if (inputTokens === undefined) {
      return {};
    }
    if (inputTokens > compactionThreshold) {
      return (await compact(state, COMPACTION_TAIL_HARD_CAP_TOKENS)) ?? {};
    }
    if (inputTokens > substitutionThreshold) {
      return substitute(
        state,
        reconstructInFlightToolCalls(state.mainActions, deps.toolManager.getToolIdMapping()),
        SUBST_INTRA_ROUND_THRESHOLD,
        { trigger: 'intra_round', reason: 'input_tokens_threshold' }
      );
    }
    return {};
  };
};
