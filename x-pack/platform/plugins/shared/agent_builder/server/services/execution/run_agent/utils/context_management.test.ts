/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChatEventType } from '@kbn/agent-builder-common';
import { AgentExecutionErrorCode } from '@kbn/agent-builder-common/agents';
import { createAgentExecutionError } from '@kbn/agent-builder-common/base/errors';
import { AgentActionType, contextLengthErrorAction } from '../actions';
import type { StateType } from '../state';
import { compactContext } from './conversation_compactor';
import { selectSubstitutionCandidates } from './filestore_substitution';
import { createContextManagementNode, type ContextManagementDeps } from './context_management';

jest.mock('./conversation_compactor', () => ({ compactContext: jest.fn() }));
jest.mock('./filestore_substitution', () => ({
  ...jest.requireActual('./filestore_substitution'),
  selectSubstitutionCandidates: jest.fn(),
}));

const compactContextMock = compactContext as jest.Mock;
const selectCandidatesMock = selectSubstitutionCandidates as jest.Mock;

const baseState = (over: Partial<StateType> = {}): StateType =>
  ({
    cycleLimit: 30,
    currentCycle: 0,
    errorCount: 0,
    mainActions: [],
    answerActions: [],
    prompts: [],
    lastContextActionCycle: Number.NEGATIVE_INFINITY,
    contextRetryCount: 0,
    ...over,
  } as StateType);

const deps = (over: Partial<ContextManagementDeps> = {}): ContextManagementDeps => ({
  conversation: {
    timeline: [],
    nextInput: { message: 'q', attachments: [] },
    attachmentTypes: [],
    attachmentStateManager: {} as any,
  },
  cycleLimit: 30,
  chatModel: {} as any,
  connector: { connectorId: 'c', config: { contextWindowLength: 100_000 } } as any,
  events: { emit: jest.fn() } as any,
  resultStore: {} as any,
  toolManager: { getToolIdMapping: () => new Map() } as any,
  resultTransformer: async (tc) => tc.results,
  logger: { info: jest.fn(), debug: jest.fn(), error: jest.fn(), warn: jest.fn() } as any,
  ...over,
});

const compactionResult = (coverage: any) => ({
  summary: { created_at: 't', token_count: 1, structured_data: {} },
  coverage,
  tokensBefore: 90_000,
  tokensAfter: 30_000,
  summarizedCycleCount: 4,
});

describe('contextManagement node', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    selectCandidatesMock.mockResolvedValue([]);
  });

  describe('Mode C — proactive', () => {
    it('compacts when inputTokens exceed 80% of the window and emits the compaction events', async () => {
      compactContextMock.mockResolvedValue(compactionResult({ actionIndex: 3 }));
      const d = deps();
      const node = createContextManagementNode(d);

      const update = await node(
        baseState({ currentCycle: 7, lastCallUsage: { inputTokens: 85_000 } })
      );

      expect(compactContextMock).toHaveBeenCalledWith(
        expect.objectContaining({ tailCapTokens: 40_000 }),
        expect.anything()
      );
      expect(update).toMatchObject({
        compactionCoverage: { actionIndex: 3 },
        lastContextActionCycle: 7,
      });
      expect(selectCandidatesMock).not.toHaveBeenCalled();
      expect(d.events.emit).toHaveBeenCalledWith(
        expect.objectContaining({ type: ChatEventType.compactionStarted })
      );
      expect(d.events.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ChatEventType.compactionCompleted,
          data: {
            token_count_before: 90_000,
            token_count_after: 30_000,
            summarized_cycle_count: 4,
          },
        })
      );
    });

    it('substitutes (not compacts) between 50% and 80%', async () => {
      selectCandidatesMock.mockResolvedValue(['c1']);
      const node = createContextManagementNode(deps());

      const update = await node(
        baseState({ currentCycle: 7, lastCallUsage: { inputTokens: 60_000 } })
      );

      expect(compactContextMock).not.toHaveBeenCalled();
      expect(selectCandidatesMock).toHaveBeenCalledWith(
        expect.objectContaining({ thresholdTokens: 1_000 })
      );
      expect(update.mainActions?.[0]).toMatchObject({
        type: AgentActionType.Substitution,
        trigger: 'intra_round',
        reason: 'input_tokens_threshold',
        substituted_tool_call_ids: ['c1'],
      });
      expect(update.lastContextActionCycle).toBe(7);
    });

    it('does nothing below the substitution threshold or without usage', async () => {
      const node = createContextManagementNode(deps());

      expect(
        await node(baseState({ currentCycle: 7, lastCallUsage: { inputTokens: 10_000 } }))
      ).toEqual({});
      expect(await node(baseState({ currentCycle: 7 }))).toEqual({});
      expect(compactContextMock).not.toHaveBeenCalled();
      expect(selectCandidatesMock).not.toHaveBeenCalled();
    });

    it('respects the cooldown after an action', async () => {
      const node = createContextManagementNode(deps());

      expect(
        await node(
          baseState({
            currentCycle: 7,
            lastContextActionCycle: 4,
            lastCallUsage: { inputTokens: 95_000 },
          })
        )
      ).toEqual({});
      expect(compactContextMock).not.toHaveBeenCalled();

      compactContextMock.mockResolvedValue(compactionResult({ actionIndex: 1 }));
      await node(
        baseState({
          currentCycle: 9,
          lastContextActionCycle: 4,
          lastCallUsage: { inputTokens: 95_000 },
        })
      );
      expect(compactContextMock).toHaveBeenCalledTimes(1);
    });

    it('caps the substitution threshold at 100k on very large windows', async () => {
      const node = createContextManagementNode(
        deps({ connector: { connectorId: 'c', config: { contextWindowLength: 1_000_000 } } as any })
      );
      selectCandidatesMock.mockResolvedValue(['c1']);

      const update = await node(
        baseState({ currentCycle: 7, lastCallUsage: { inputTokens: 150_000 } })
      );

      expect(update.mainActions?.[0]).toMatchObject({ type: AgentActionType.Substitution });
    });
  });

  describe('Mode A — forced', () => {
    const error = createAgentExecutionError('x', AgentExecutionErrorCode.contextLengthExceeded, {});

    it('compacts with the reactive cap regardless of thresholds and cooldown', async () => {
      compactContextMock.mockResolvedValue(compactionResult({ actionIndex: 1 }));
      const node = createContextManagementNode(deps());

      const update = await node(
        baseState({
          currentCycle: 3,
          lastContextActionCycle: 2,
          mainActions: [contextLengthErrorAction(error)],
        })
      );

      expect(compactContextMock).toHaveBeenCalledWith(
        expect.objectContaining({ tailCapTokens: 20_000 }),
        expect.anything()
      );
      expect(update).toMatchObject({
        compactionCoverage: { actionIndex: 1 },
        lastContextActionCycle: 3,
      });
    });

    it('throws a context-length error when nothing is left to compact', async () => {
      compactContextMock.mockResolvedValue(undefined);
      const node = createContextManagementNode(deps());

      await expect(
        node(baseState({ mainActions: [contextLengthErrorAction(error)] }))
      ).rejects.toMatchObject({
        meta: { errCode: AgentExecutionErrorCode.contextLengthExceeded },
      });
    });
  });

  describe('Mode B — round start', () => {
    it('compacts at cycle 0 from the previous round last-call usage', async () => {
      compactContextMock.mockResolvedValue(compactionResult({ eventId: 'e' }));
      const node = createContextManagementNode(
        deps({ previousRound: { lastCallInputTokens: 90_000, connectorId: 'c' } })
      );

      const update = await node(baseState());

      expect(compactContextMock).toHaveBeenCalledWith(
        expect.objectContaining({ tailCapTokens: 40_000 }),
        expect.anything()
      );
      expect(update).toMatchObject({ compactionCoverage: { eventId: 'e' } });
      expect(selectCandidatesMock).not.toHaveBeenCalled();
    });

    it('uses the cold threshold for round-start substitution when the cache is stale', async () => {
      selectCandidatesMock.mockResolvedValue(['old']);
      const node = createContextManagementNode(
        deps({ previousRound: { terminatedAt: '2000-01-01T00:00:00.000Z', connectorId: 'c' } })
      );

      const update = await node(baseState());

      expect(selectCandidatesMock).toHaveBeenCalledWith(
        expect.objectContaining({ thresholdTokens: 1_000 })
      );
      expect(update.mainActions?.[0]).toMatchObject({
        trigger: 'round_start',
        reason: 'cache_cold',
      });
    });

    it('uses the hot threshold when the previous round ended within the ttl', async () => {
      selectCandidatesMock.mockResolvedValue(['old']);
      const node = createContextManagementNode(
        deps({ previousRound: { terminatedAt: new Date().toISOString(), connectorId: 'c' } })
      );

      const update = await node(baseState());

      expect(selectCandidatesMock).toHaveBeenCalledWith(
        expect.objectContaining({ thresholdTokens: 10_000 })
      );
      expect(update.mainActions?.[0]).toMatchObject({
        trigger: 'round_start',
        reason: 'cache_hot',
      });
    });

    it('returns no update when nothing qualifies for substitution', async () => {
      const node = createContextManagementNode(deps());
      expect(await node(baseState())).toEqual({});
    });
  });
});
