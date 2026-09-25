/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import type { InferenceConnector } from '@kbn/inference-common';
import type { ConversationRoundStep, ToolCallStep } from '@kbn/agent-builder-common';
import {
  ChatEventType,
  ConversationRoundStepType,
  ToolResultType,
} from '@kbn/agent-builder-common';
import { AgentExecutionErrorCode } from '@kbn/agent-builder-common/agents';
import { createAgentExecutionError } from '@kbn/agent-builder-common/base/errors';
import { createToolResultStoreMock } from '../../../../test_utils/runner';
import { timelineFromRounds } from '../../../../test_utils/timeline';
import type { StateType, StateUpdate } from '../state';
import { applyStepUpdates, type RunStepUpdate } from '../step_state';
import type { CompactionRequest } from '../transient_state';
import type { ProcessedTimelineEvent } from './context_timeline';
import { compactContext } from './conversation_compactor';
import { selectSubstitutionCandidates } from './filestore_substitution';
import { createContextManagementNodes, type ContextManagementDeps } from './context_management';

jest.mock('./conversation_compactor', () => ({ compactContext: jest.fn() }));
jest.mock('./filestore_substitution', () => ({
  ...jest.requireActual('./filestore_substitution'),
  selectSubstitutionCandidates: jest.fn(),
}));

const compactContextMock = compactContext as jest.Mock;
const selectCandidatesMock = selectSubstitutionCandidates as jest.Mock;

const call = (id: string): ToolCallStep => ({
  type: ConversationRoundStepType.toolCall,
  tool_call_id: id,
  tool_id: 'my.tool',
  tool_call_group_id: `g-${id}`,
  params: {},
  results: [{ type: ToolResultType.other, tool_result_id: `r-${id}`, data: {} }],
  progression: [],
});

const baseState = (over: Partial<StateType> = {}): StateType =>
  ({
    cycleLimit: 30,
    roundId: 'current',
    currentCycle: 0,
    errorCount: 0,
    steps: [],
    pendingToolCallIds: [],
    toolRenderState: {},
    retryNotices: [],
    lastContextActionCycle: Number.NEGATIVE_INFINITY,
    contextRetryCount: 0,
    ...over,
  } as StateType);

const deps = (
  over: Partial<ContextManagementDeps> = {},
  timeline: ProcessedTimelineEvent[] = []
): ContextManagementDeps => ({
  conversation: {
    timeline,
    nextInput: { message: 'q', attachments: [] },
    attachmentTypes: [],
    attachmentStateManager: {} as ContextManagementDeps['conversation']['attachmentStateManager'],
  },
  chatModel: {} as InferenceChatModel,
  connector: {
    connectorId: 'c',
    config: { contextWindowLength: 100_000 },
  } as unknown as InferenceConnector,
  cacheControl: { type: 'ephemeral', ttl: '5m' },
  resultStore: createToolResultStoreMock(),
  resultTransformer: async (toolCall) => toolCall.results,
  logger: loggerMock.create(),
  events: { emit: jest.fn() },
  ...over,
});

const historyWithCall = () =>
  timelineFromRounds([
    { id: 'a', input: { message: 'earlier', attachments: [] }, steps: [call('old')] },
  ]);

const appendedSteps = (update: StateUpdate): ConversationRoundStep[] =>
  applyStepUpdates([], (update.steps as RunStepUpdate[] | undefined) ?? []);

const compactionResult = () => ({
  summary: {
    summarized_up_to: { round_id: 'current', tool_call_id: 'x1' },
    summarized_round_count: 0,
    created_at: 't',
    token_count: 1,
    structured_data: {},
  },
  tokensBefore: 90_000,
  tokensAfter: 30_000,
  summarizedCycleCount: 4,
});

describe('contextManagement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    selectCandidatesMock.mockResolvedValue([]);
  });

  describe('proactive (cycle > 0)', () => {
    it('requests a compaction when the last call exceeds 80% of the window', async () => {
      const { contextManagement } = createContextManagementNodes(deps());

      const update = await contextManagement(
        baseState({ currentCycle: 7, lastCallUsage: { inputTokens: 85_000 } })
      );

      expect(update).toEqual({
        compactionRequest: { trigger: 'proactive', tailCapTokens: 40_000, tokensBefore: 85_000 },
      });
      expect(selectCandidatesMock).not.toHaveBeenCalled();
    });

    it('substitutes the visible current-run calls between 50% and 80%', async () => {
      selectCandidatesMock.mockResolvedValue([{ round_id: 'current', tool_call_id: 'x1' }]);
      const { contextManagement } = createContextManagementNodes(deps({}, historyWithCall()));

      const update = await contextManagement(
        baseState({
          currentCycle: 7,
          lastCallUsage: { inputTokens: 60_000 },
          steps: [call('x1'), call('x2')],
          pendingToolCallIds: ['x2'],
        })
      );

      expect(selectCandidatesMock).toHaveBeenCalledWith(
        expect.objectContaining({
          thresholdTokens: 1_000,
          toolCalls: [
            { roundId: 'current', toolCall: expect.objectContaining({ tool_call_id: 'x1' }) },
          ],
        })
      );
      expect(appendedSteps(update)).toEqual([
        {
          type: ConversationRoundStepType.substitution,
          substituted_tool_calls: [{ round_id: 'current', tool_call_id: 'x1' }],
          trigger: 'intra_round',
          threshold_tokens: 1_000,
        },
      ]);
      expect(update.lastContextActionCycle).toBe(7);
    });

    it('does nothing below the substitution threshold or without usage', async () => {
      const { contextManagement } = createContextManagementNodes(deps());

      expect(
        await contextManagement(
          baseState({ currentCycle: 7, lastCallUsage: { inputTokens: 10_000 } })
        )
      ).toEqual({});
      expect(await contextManagement(baseState({ currentCycle: 7 }))).toEqual({});
      expect(selectCandidatesMock).not.toHaveBeenCalled();
    });

    it('respects the cooldown after an action', async () => {
      const { contextManagement } = createContextManagementNodes(deps());
      const usage = { inputTokens: 95_000 };

      expect(
        await contextManagement(
          baseState({ currentCycle: 7, lastContextActionCycle: 4, lastCallUsage: usage })
        )
      ).toEqual({});
      expect(
        await contextManagement(
          baseState({ currentCycle: 9, lastContextActionCycle: 4, lastCallUsage: usage })
        )
      ).toHaveProperty('compactionRequest');
    });

    it('caps the substitution threshold at 100k on very large windows', async () => {
      selectCandidatesMock.mockResolvedValue([{ round_id: 'current', tool_call_id: 'x1' }]);
      const { contextManagement } = createContextManagementNodes(
        deps({
          connector: {
            connectorId: 'c',
            config: { contextWindowLength: 1_000_000 },
          } as unknown as InferenceConnector,
        })
      );

      const update = await contextManagement(
        baseState({ currentCycle: 7, lastCallUsage: { inputTokens: 150_000 }, steps: [call('x1')] })
      );

      expect(appendedSteps(update)).toEqual([
        expect.objectContaining({
          substituted_tool_calls: [{ round_id: 'current', tool_call_id: 'x1' }],
        }),
      ]);
    });
  });

  describe('forced', () => {
    const error = createAgentExecutionError('x', AgentExecutionErrorCode.contextLengthExceeded, {});

    it('requests a compaction with the reactive cap regardless of thresholds and cooldown', async () => {
      const { contextManagement } = createContextManagementNodes(deps());

      const update = await contextManagement(
        baseState({
          currentCycle: 3,
          lastContextActionCycle: 2,
          lastCallUsage: { inputTokens: 1_000 },
          researchOutcome: { type: 'context_length_error', error },
        })
      );

      expect(update).toEqual({
        compactionRequest: { trigger: 'forced', tailCapTokens: 20_000, tokensBefore: 1_000 },
      });
    });
  });

  describe('round start (cycle 0)', () => {
    it('requests a compaction from the previous round last-call usage', async () => {
      const { contextManagement } = createContextManagementNodes(
        deps({ previousRound: { lastCallInputTokens: 90_000, connectorId: 'c' } })
      );

      expect(await contextManagement(baseState())).toEqual({
        compactionRequest: { trigger: 'round_start', tailCapTokens: 40_000, tokensBefore: 90_000 },
      });
      expect(selectCandidatesMock).not.toHaveBeenCalled();
    });

    it('substitutes visible history calls with the cold threshold when the cache is stale', async () => {
      selectCandidatesMock.mockResolvedValue([{ round_id: 'a', tool_call_id: 'old' }]);
      const { contextManagement } = createContextManagementNodes(
        deps(
          { previousRound: { terminatedAt: '2000-01-01T00:00:00.000Z', connectorId: 'c' } },
          historyWithCall()
        )
      );

      const update = await contextManagement(baseState());

      expect(selectCandidatesMock).toHaveBeenCalledWith(
        expect.objectContaining({
          thresholdTokens: 1_000,
          toolCalls: [{ roundId: 'a', toolCall: expect.objectContaining({ tool_call_id: 'old' }) }],
        })
      );
      expect(appendedSteps(update)).toEqual([
        expect.objectContaining({ trigger: 'round_start', threshold_tokens: 1_000 }),
      ]);
    });

    it('uses the hot threshold when the previous round ended within the ttl', async () => {
      selectCandidatesMock.mockResolvedValue([{ round_id: 'a', tool_call_id: 'old' }]);
      const { contextManagement } = createContextManagementNodes(
        deps(
          { previousRound: { terminatedAt: new Date().toISOString(), connectorId: 'c' } },
          historyWithCall()
        )
      );

      const update = await contextManagement(baseState());

      expect(selectCandidatesMock).toHaveBeenCalledWith(
        expect.objectContaining({ thresholdTokens: 10_000 })
      );
      expect(appendedSteps(update)).toEqual([
        expect.objectContaining({ trigger: 'round_start', threshold_tokens: 10_000 }),
      ]);
    });

    it('skips history calls the summary already covers', async () => {
      const { contextManagement } = createContextManagementNodes(deps({}, historyWithCall()));

      await contextManagement(
        baseState({
          compactionSummary: {
            summarized_up_to: { round_id: 'a', tool_call_id: 'old' },
            summarized_round_count: 1,
            created_at: 't',
            token_count: 1,
            structured_data: {} as never,
          },
        })
      );

      expect(selectCandidatesMock).toHaveBeenCalledWith(expect.objectContaining({ toolCalls: [] }));
    });

    it('returns no update when nothing qualifies for substitution', async () => {
      const { contextManagement } = createContextManagementNodes(deps());
      expect(await contextManagement(baseState())).toEqual({});
    });
  });
});

describe('compactContext node', () => {
  const request = (over: Partial<CompactionRequest> = {}): CompactionRequest => ({
    trigger: 'proactive',
    tailCapTokens: 40_000,
    tokensBefore: 85_000,
    ...over,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('runs the compactor and appends the compaction step and summary', async () => {
    compactContextMock.mockResolvedValue(compactionResult());
    const { compactContext: node } = createContextManagementNodes(deps());

    const update = await node(baseState({ currentCycle: 7, compactionRequest: request() }));

    expect(compactContextMock).toHaveBeenCalledWith(
      expect.objectContaining({ tailCapTokens: 40_000 }),
      expect.objectContaining({ budget: expect.any(Object) })
    );
    expect(appendedSteps(update)).toEqual([
      {
        type: ConversationRoundStepType.compaction,
        summarized_cycle_count: 4,
        token_count_before: 90_000,
        token_count_after: 30_000,
      },
    ]);
    expect(update).toMatchObject({
      compactionSummary: compactionResult().summary,
      compactionRequest: undefined,
      lastContextActionCycle: 7,
    });
  });

  it('allows the summarizer fallback for forced compactions only', async () => {
    compactContextMock.mockResolvedValue(compactionResult());
    const { compactContext: node } = createContextManagementNodes(deps());

    await node(baseState({ compactionRequest: request() }));
    await node(baseState({ compactionRequest: request({ trigger: 'forced' }) }));

    expect(compactContextMock.mock.calls.map(([input]) => input.fallbackOnFailure)).toEqual([
      false,
      true,
    ]);
  });

  it('emits compaction_started only for a compaction that completed', async () => {
    const events = { emit: jest.fn() };
    compactContextMock.mockResolvedValueOnce(compactionResult());
    const { compactContext: node } = createContextManagementNodes(deps({ events }));

    await node(baseState({ currentCycle: 7, compactionRequest: request() }));
    expect(events.emit).toHaveBeenCalledWith({
      type: ChatEventType.compactionStarted,
      data: { token_count_before: 85_000 },
    });

    events.emit.mockClear();
    compactContextMock.mockResolvedValueOnce(undefined);
    await node(baseState({ currentCycle: 7, compactionRequest: request() }));
    expect(events.emit).not.toHaveBeenCalled();
  });

  it('clears the request and starts the cooldown when the compaction is skipped', async () => {
    compactContextMock.mockResolvedValue(undefined);
    const { compactContext: node } = createContextManagementNodes(deps());

    expect(await node(baseState({ currentCycle: 7, compactionRequest: request() }))).toEqual({
      compactionRequest: undefined,
      lastContextActionCycle: 7,
    });
  });

  it('throws a context-length error when a forced compaction has nothing to compact', async () => {
    compactContextMock.mockResolvedValue(undefined);
    const { compactContext: node } = createContextManagementNodes(deps());

    await expect(
      node(baseState({ compactionRequest: request({ trigger: 'forced', tailCapTokens: 20_000 }) }))
    ).rejects.toMatchObject({
      meta: { errCode: AgentExecutionErrorCode.contextLengthExceeded },
    });
  });

  it('throws without a compaction request', async () => {
    const { compactContext: node } = createContextManagementNodes(deps());
    await expect(node(baseState())).rejects.toMatchObject({
      meta: { errCode: AgentExecutionErrorCode.invalidState },
    });
  });
});
