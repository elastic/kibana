/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChatCompleteCacheControl, InferenceConnector } from '@kbn/inference-common';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import type { SubstitutionStepData, ToolCallStep } from '@kbn/agent-builder-common';
import {
  ChatEventType,
  ConversationRoundStepType,
  createSubstitutionStep,
} from '@kbn/agent-builder-common';
import type { AgentEventEmitter } from '@kbn/agent-builder-server';
import { AgentExecutionErrorCode as ErrCodes } from '@kbn/agent-builder-common/agents';
import { createAgentExecutionError } from '@kbn/agent-builder-common/base/errors';
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
import type { StateType, StateUpdate } from '../state';
import { toCurrentRun } from '../state';
import { stepUpdates } from '../step_state';
import type { ProcessedConversation } from './prepare_conversation';
import { computeCacheState } from './cache_state';
import { computeContextBudget } from './context_budget';
import { listVisibleUnits, unitToolCalls } from './context_coverage';
import { compactContext } from './conversation_compactor';
import { selectSubstitutionCandidates, type RoundToolCall } from './filestore_substitution';
import { buildContextView, type VisibleContextDeps } from './visible_context';

export interface PreviousRoundInfo {
  terminatedAt?: string;
  connectorId?: string;
  lastCallInputTokens?: number;
}

export interface ContextManagementDeps extends VisibleContextDeps {
  conversation: ProcessedConversation;
  chatModel: InferenceChatModel;
  events: AgentEventEmitter;
  connector: InferenceConnector;
  cacheControl?: ChatCompleteCacheControl;
  abortSignal?: AbortSignal;
  previousRound?: PreviousRoundInfo;
}

/**
 * The two context-management nodes. `contextManagement` runs at the top of every cycle and either
 * applies a substitution or requests a compaction, executed by `compactContext`. Three modes:
 * - forced (the last research call exceeded the context window): compact with the reactive tail cap;
 * - round start (cycle 0): compact from the previous round's last-call usage, else cache-aware
 *   substitution over the visible history;
 * - proactive (cycle N > 0): unless in cooldown after an action, compare the last call's input
 *   tokens to the window-relative thresholds; compaction wins over substitution.
 */
export const createContextManagementNodes = (deps: ContextManagementDeps) => {
  const budget = computeContextBudget(deps.connector);
  const compactionThreshold = INTRA_ROUND_COMPACTION_FRACTION * budget.totalBudget;
  const substitutionThreshold = Math.min(
    INTRA_ROUND_SUBSTITUTION_FRACTION * budget.totalBudget,
    INTRA_ROUND_SUBSTITUTION_MAX_TOKENS
  );

  const substitute = async (
    state: StateType,
    toolCalls: RoundToolCall[],
    data: Omit<SubstitutionStepData, 'substituted_tool_calls'>
  ): Promise<StateUpdate> => {
    const { marks } = buildContextView(
      { conversation: deps.conversation, run: toCurrentRun(state) },
      deps
    );
    const selected = await selectSubstitutionCandidates({
      toolCalls,
      resultStore: deps.resultStore,
      thresholdTokens: data.threshold_tokens,
      alreadyMarked: marks,
    });
    if (selected.length === 0) {
      deps.logger.debug(
        `[contextManagement] substitution skipped cycle=${state.currentCycle} trigger=${data.trigger} candidates=${toolCalls.length} already_marked=${marks.size}`
      );
      return {};
    }
    deps.logger.info(
      `[contextManagement] substitution applied cycle=${state.currentCycle} trigger=${data.trigger} threshold=${data.threshold_tokens} substituted=${selected.length}`
    );
    return {
      steps: [
        stepUpdates.append(createSubstitutionStep({ ...data, substituted_tool_calls: selected })),
      ],
      lastContextActionCycle: state.currentCycle,
    };
  };

  /** Tool calls the model currently sees in full: history ones for round start, else the run's. */
  const visibleToolCalls = (state: StateType, scope: 'history' | 'current'): RoundToolCall[] => {
    const run = toCurrentRun(state);
    const view = buildContextView({ conversation: deps.conversation, run }, deps);
    const pending = new Set(state.pendingToolCallIds);
    const isDurable = ({ tool_call_id: id }: ToolCallStep) =>
      !pending.has(id) && (state.toolRenderState[id]?.kind ?? 'server') === 'server';
    return listVisibleUnits({
      entries: view.history.entries,
      steps: run.steps,
      visibility: view.visibility,
    }).flatMap((unit) => {
      if (unit.kind === 'message') {
        return [];
      }
      if (unit.kind === 'current_cycle') {
        return scope === 'current'
          ? unitToolCalls(unit, run.steps)
              .filter(isDurable)
              .map((toolCall) => ({ roundId: run.roundId, toolCall }))
          : [];
      }
      return scope === 'history'
        ? unitToolCalls(unit, run.steps).map((toolCall) => ({ roundId: unit.round.id, toolCall }))
        : [];
    });
  };

  const contextManagement = async (state: StateType): Promise<StateUpdate> => {
    const lastCallTokens = state.lastCallUsage?.inputTokens;

    if (state.researchOutcome?.type === 'context_length_error') {
      deps.logger.info(`[contextManagement] cycle=${state.currentCycle} mode=forced`);
      return {
        compactionRequest: {
          trigger: 'forced',
          tailCapTokens: COMPACTION_TAIL_HARD_CAP_TOKENS_REACTIVE,
          tokensBefore: lastCallTokens ?? 0,
        },
      };
    }

    if (state.currentCycle === 0) {
      const hint = deps.previousRound?.lastCallInputTokens;
      if (hint !== undefined && hint > compactionThreshold) {
        deps.logger.debug(
          `[contextManagement] cycle=0 mode=roundStart decision=compact previousLastCall=${hint} threshold=${compactionThreshold}`
        );
        return {
          compactionRequest: {
            trigger: 'round_start',
            tailCapTokens: COMPACTION_TAIL_HARD_CAP_TOKENS,
            tokensBefore: hint,
          },
        };
      }
      const cacheState = computeCacheState({
        lastTerminatedAt: deps.previousRound?.terminatedAt,
        lastConnectorId: deps.previousRound?.connectorId,
        connectorId: deps.connector.connectorId,
        cacheControl: deps.cacheControl,
      });
      deps.logger.debug(
        `[contextManagement] cycle=0 mode=roundStart cacheState=${cacheState} previousLastCall=${
          hint ?? 'unknown'
        } decision=maybe_substitute`
      );
      return substitute(state, visibleToolCalls(state, 'history'), {
        trigger: 'round_start',
        threshold_tokens:
          cacheState === 'cold'
            ? SUBST_ROUND_START_THRESHOLD_COLD
            : SUBST_ROUND_START_THRESHOLD_HOT,
      });
    }

    if (state.currentCycle - state.lastContextActionCycle < CONTEXT_MANAGEMENT_COOLDOWN_CYCLES) {
      return {};
    }
    if (lastCallTokens === undefined) {
      return {};
    }
    if (lastCallTokens > compactionThreshold) {
      deps.logger.debug(
        `[contextManagement] cycle=${state.currentCycle} mode=proactive inputTokens=${lastCallTokens} decision=compact threshold=${compactionThreshold}`
      );
      return {
        compactionRequest: {
          trigger: 'proactive',
          tailCapTokens: COMPACTION_TAIL_HARD_CAP_TOKENS,
          tokensBefore: lastCallTokens,
        },
      };
    }
    if (lastCallTokens > substitutionThreshold) {
      deps.logger.debug(
        `[contextManagement] cycle=${state.currentCycle} mode=proactive inputTokens=${lastCallTokens} decision=substitute threshold=${substitutionThreshold}`
      );
      return substitute(state, visibleToolCalls(state, 'current'), {
        trigger: 'intra_round',
        threshold_tokens: SUBST_INTRA_ROUND_THRESHOLD,
      });
    }
    return {};
  };

  const compactContextNode = async (state: StateType): Promise<StateUpdate> => {
    const request = state.compactionRequest;
    if (!request) {
      throw createAgentExecutionError(
        '[compactContext] missing compaction request',
        ErrCodes.invalidState,
        {}
      );
    }
    deps.logger.info(
      `[contextManagement] compaction starting cycle=${state.currentCycle} trigger=${request.trigger} inputTokens=${request.tokensBefore} tailCap=${request.tailCapTokens}`
    );
    const result = await compactContext(
      {
        conversation: deps.conversation,
        run: toCurrentRun(state),
        tailCapTokens: request.tailCapTokens,
        // a forced compaction is the round's last resort, a proactive one can be retried later
        fallbackOnFailure: request.trigger === 'forced',
      },
      { ...deps, budget }
    );
    if (!result) {
      if (request.trigger === 'forced') {
        throw createAgentExecutionError(
          'Context length exceeded and no history is left to compact',
          ErrCodes.contextLengthExceeded,
          {}
        );
      }
      deps.logger.info(
        `[contextManagement] compaction skipped cycle=${state.currentCycle} trigger=${request.trigger}`
      );
      return { compactionRequest: undefined, lastContextActionCycle: state.currentCycle };
    }
    deps.events.emit({
      type: ChatEventType.compactionStarted,
      data: { token_count_before: request.tokensBefore },
    });
    deps.logger.info(
      `[contextManagement] compaction completed cycle=${state.currentCycle} covered=${result.summarizedCycleCount} tokensBefore=${result.tokensBefore} tokensAfter=${result.tokensAfter}`
    );
    return {
      steps: [
        stepUpdates.append({
          type: ConversationRoundStepType.compaction,
          summarized_cycle_count: result.summarizedCycleCount,
          token_count_before: result.tokensBefore,
          token_count_after: result.tokensAfter,
        }),
      ],
      compactionSummary: result.summary,
      compactionRequest: undefined,
      lastContextActionCycle: state.currentCycle,
    };
  };

  return { contextManagement, compactContext: compactContextNode };
};
