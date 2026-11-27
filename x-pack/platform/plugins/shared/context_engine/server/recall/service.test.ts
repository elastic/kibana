/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { AuditLogger } from '@kbn/core-security-server';
import { DEFAULT_RECALL_TOKEN_BUDGET } from '../../common/constants';
import type {
  AiIndexRecallResult,
  RecallJsonResponse,
  RecallRequest,
  RecallResult,
  RecallYamlResponse,
  SessionEventRecallResult,
  SessionMemoryRecallResult,
} from '../../common/http_api/recall';
import { memoryRecallAuditEvent } from '../audit/audit_events';
import { retrieveAiIndices } from './ai_index_retriever';
import { formatRecallYaml, packRecallResults } from './format';
import type { RecallReranker } from './rerank';
import { createRecallService } from './service';
import type { RecallContext } from './service';
import { retrieveSessionEvents, retrieveSessionMemories } from './session_retrievers';

jest.mock('./session_retrievers');
jest.mock('./ai_index_retriever');

const retrieveSessionEventsMock = jest.mocked(retrieveSessionEvents);
const retrieveSessionMemoriesMock = jest.mocked(retrieveSessionMemories);
const retrieveAiIndicesMock = jest.mocked(retrieveAiIndices);

const SPACE = 'default';
const USER_ID = 'user-1';
const QUERY = 'deployment checklist';
const SESSION_IDS = ['session-1', 'session-2'];

const eventResult: SessionEventRecallResult = {
  id: 'event-1',
  session_id: 'session-1',
  source: 'session_events',
  date: '2026-01-01T00:00:00.000Z',
  role: 'user',
  content: 'Remember to run the deployment checklist',
};

const memoryResult: SessionMemoryRecallResult = {
  id: 'memory-1',
  session_id: 'session-2',
  source: 'session_memory',
  date: '2026-01-02T00:00:00.000Z',
  content: 'The user prefers blue-green deployments',
};

const aiIndexResult: AiIndexRecallResult = {
  id: 'ki-1',
  source: 'ai_index:ops',
  content: 'Deployments require a change ticket',
};

describe('createRecallService', () => {
  const internalEsClient = elasticsearchServiceMock.createElasticsearchClient();
  const callerEsClient = elasticsearchServiceMock.createElasticsearchClient();
  const aiIndexService = { list: jest.fn() };
  const logger = loggingSystemMock.createLogger();
  let auditLogger: jest.Mocked<AuditLogger>;
  let reranker: jest.Mocked<RecallReranker>;
  let getNow: jest.Mock<number, []>;

  const context = (overrides: Partial<RecallContext> = {}): RecallContext => ({
    space: SPACE,
    callerEsClient,
    auditLogger,
    ...overrides,
  });

  const recallRequest = (overrides: Partial<RecallRequest> = {}): RecallRequest => ({
    query: QUERY,
    user_id: USER_ID,
    include: ['session_events', 'session_memory', 'ai_index:*'],
    session_ids: SESSION_IDS,
    ...overrides,
  });

  const recall = (
    request: Partial<RecallRequest> = {},
    contextOverrides?: Partial<RecallContext>
  ) =>
    createRecallService({ internalEsClient, aiIndexService, reranker, logger, getNow }).recall(
      context(contextOverrides),
      recallRequest(request)
    );

  const recallJson = async (request: Partial<RecallRequest> = {}): Promise<RecallJsonResponse> => {
    const response = await recall({ format: 'json', ...request });
    if (!('results' in response)) {
      throw new Error('Expected a JSON recall response');
    }
    return response;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    auditLogger = { log: jest.fn(), enabled: true, includeSavedObjectNames: false };
    reranker = { rerank: jest.fn(async ({ candidates }) => [...candidates]) };
    getNow = jest.fn<number, []>().mockReturnValue(1_000);
    retrieveSessionEventsMock.mockResolvedValue([eventResult]);
    retrieveSessionMemoriesMock.mockResolvedValue([memoryResult]);
    retrieveAiIndicesMock.mockResolvedValue([aiIndexResult]);
  });

  const expectNothingQueried = () => {
    expect(retrieveSessionEventsMock).not.toHaveBeenCalled();
    expect(retrieveSessionMemoriesMock).not.toHaveBeenCalled();
    expect(retrieveAiIndicesMock).not.toHaveBeenCalled();
    expect(reranker.rerank).not.toHaveBeenCalled();
    expect(auditLogger.log).not.toHaveBeenCalled();
  };

  describe('input validation', () => {
    it.each([
      ['an empty space', {}, { space: '' }, 'Recall requires a non-empty space'],
      ['a blank space', {}, { space: '   ' }, 'Recall requires a non-empty space'],
      ['an empty user_id', { user_id: '' }, {}, 'Recall requires a non-empty user_id'],
      ['a blank user_id', { user_id: '  ' }, {}, 'Recall requires a non-empty user_id'],
      ['an empty query', { query: '' }, {}, 'Recall requires a non-empty query'],
      ['a blank query', { query: '\n\t' }, {}, 'Recall requires a non-empty query'],
      ['an empty include', { include: [] }, {}, 'include must name at least one recall store'],
      [
        'an invalid ai_index include',
        { include: ['ai_index:'] },
        {},
        '[ai_index:] must be ai_index:* or ai_index:<id> with a valid AI index id of at most',
      ],
    ] satisfies Array<[string, Partial<RecallRequest>, Partial<RecallContext>, string]>)(
      'rejects %s before querying or auditing',
      async (_label, request, contextOverrides, message) => {
        await expect(recall(request, contextOverrides)).rejects.toThrow(message);
        expectNothingQueried();
      }
    );
  });

  describe('store selection and candidate pool', () => {
    it('queries session stores with the internal client and AI indices with the caller client', async () => {
      await recall();

      expect(retrieveSessionEventsMock).toHaveBeenCalledWith({
        esClient: internalEsClient,
        space: SPACE,
        userId: USER_ID,
        query: QUERY,
        sessionIds: SESSION_IDS,
        size: 25,
      });
      expect(retrieveSessionMemoriesMock).toHaveBeenCalledWith({
        esClient: internalEsClient,
        space: SPACE,
        userId: USER_ID,
        query: QUERY,
        sessionIds: SESSION_IDS,
        size: 25,
      });
      expect(retrieveAiIndicesMock).toHaveBeenCalledWith({
        esClient: callerEsClient,
        aiIndexService,
        logger,
        space: SPACE,
        userId: USER_ID,
        query: QUERY,
        selector: { kind: 'all' },
        size: 50,
      });
    });

    it('selects specific AI index ids and skips session memory when not included', async () => {
      await recall({ include: ['session_events', 'ai_index:ops', 'ai_index:docs'] });

      expect(retrieveSessionEventsMock).toHaveBeenCalledWith(
        expect.objectContaining({ esClient: internalEsClient, size: 33 })
      );
      expect(retrieveSessionMemoriesMock).not.toHaveBeenCalled();
      expect(retrieveAiIndicesMock).toHaveBeenCalledWith(
        expect.objectContaining({
          esClient: callerEsClient,
          selector: { kind: 'ids', ids: ['ops', 'docs'] },
          size: 67,
        })
      );
    });

    it('gives the whole pool to AI indices when only AI indices are included', async () => {
      await recall({ include: ['ai_index:ops'] });

      expect(retrieveSessionEventsMock).not.toHaveBeenCalled();
      expect(retrieveSessionMemoriesMock).not.toHaveBeenCalled();
      expect(retrieveAiIndicesMock).toHaveBeenCalledWith(
        expect.objectContaining({
          esClient: callerEsClient,
          selector: { kind: 'ids', ids: ['ops'] },
          size: 100,
        })
      );
    });

    it('splits the pool evenly when only session stores are included', async () => {
      await recall({ include: ['session_events', 'session_memory'] });

      expect(retrieveSessionEventsMock).toHaveBeenCalledWith(
        expect.objectContaining({ esClient: internalEsClient, size: 50 })
      );
      expect(retrieveSessionMemoriesMock).toHaveBeenCalledWith(
        expect.objectContaining({ esClient: internalEsClient, size: 50 })
      );
      expect(retrieveAiIndicesMock).not.toHaveBeenCalled();
    });
  });

  describe('reranking, packing and formatting', () => {
    it('reranks the combined candidates and returns YAML by default', async () => {
      reranker.rerank.mockResolvedValue([aiIndexResult, memoryResult, eventResult]);

      const response = await recall();

      expect(reranker.rerank).toHaveBeenCalledWith({
        query: QUERY,
        candidates: [eventResult, memoryResult, aiIndexResult],
      });
      expect(response).toEqual<RecallYamlResponse>({
        context: formatRecallYaml([aiIndexResult, memoryResult, eventResult]),
        took_ms: 0,
      });
    });

    it('returns reranked results as JSON when requested', async () => {
      reranker.rerank.mockResolvedValue([memoryResult, aiIndexResult, eventResult]);

      expect(await recallJson()).toEqual<RecallJsonResponse>({
        results: [memoryResult, aiIndexResult, eventResult],
        took_ms: 0,
      });
    });

    it('packs reranked results to the token budget', async () => {
      reranker.rerank.mockResolvedValue([aiIndexResult, memoryResult, eventResult]);

      const { results } = await recallJson({ token_budget: 1 });

      expect(results).toEqual([aiIndexResult]);
    });

    it('applies the default token budget when none is given', async () => {
      const large = ['ki-1', 'ki-2', 'ki-3'].map((id) => ({
        ...aiIndexResult,
        id,
        content: 'x'.repeat(10_000),
      }));
      retrieveAiIndicesMock.mockResolvedValue(large);

      const { results } = await recallJson({ include: ['ai_index:*'] });

      expect(results).toEqual(
        packRecallResults({
          results: large,
          tokenBudget: DEFAULT_RECALL_TOKEN_BUDGET,
          format: 'json',
        }).results
      );
      expect(results.length).toBeGreaterThan(1);
      expect(results.length).toBeLessThan(large.length);
    });

    it('returns empty YAML when no candidates match', async () => {
      retrieveSessionEventsMock.mockResolvedValue([]);
      retrieveSessionMemoriesMock.mockResolvedValue([]);
      retrieveAiIndicesMock.mockResolvedValue([]);

      expect(await recall()).toEqual({ context: 'results: []\n', took_ms: 0 });
    });

    it('returns empty JSON results when no candidates match', async () => {
      retrieveSessionEventsMock.mockResolvedValue([]);
      retrieveSessionMemoriesMock.mockResolvedValue([]);
      retrieveAiIndicesMock.mockResolvedValue([]);

      expect(await recallJson()).toEqual({ results: [], took_ms: 0 });
    });

    it('reports took_ms from getNow', async () => {
      getNow.mockReturnValueOnce(1_000).mockReturnValueOnce(1_250);

      expect((await recall()).took_ms).toBe(250);
    });

    it('clamps a negative took_ms to zero', async () => {
      getNow.mockReturnValueOnce(1_000).mockReturnValueOnce(900);

      expect((await recall()).took_ms).toBe(0);
    });
  });

  describe('audit logging', () => {
    it.each([
      [['session_events'], [eventResult], 'session_events'],
      [['session_memory'], [memoryResult], 'session_memory'],
    ] satisfies Array<[RecallRequest['include'], RecallResult[], string]>)(
      'audits a successful recall from %j',
      async (include, results, storeList) => {
        await recall({ include });

        expect(auditLogger.log).toHaveBeenCalledTimes(1);
        expect(auditLogger.log).toHaveBeenCalledWith({
          message: `User has recalled ${results.length} result(s) from [${storeList}] of user [id=${USER_ID}]`,
          event: {
            action: 'memory_recall',
            category: ['database'],
            type: ['access'],
            outcome: 'success',
          },
          user: { target: { id: USER_ID } },
          error: undefined,
        });
      }
    );

    it('counts only memory results when AI index results are also returned', async () => {
      retrieveAiIndicesMock.mockResolvedValue([aiIndexResult, { ...aiIndexResult, id: 'ki-2' }]);

      await recall();

      expect(auditLogger.log).toHaveBeenCalledTimes(1);
      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          message: `User has recalled 2 result(s) from [session_events, session_memory] of user [id=${USER_ID}]`,
          event: expect.objectContaining({ action: 'memory_recall', outcome: 'success' }),
        })
      );
    });

    it('counts only memory results that survive token budget packing', async () => {
      reranker.rerank.mockResolvedValue([aiIndexResult, memoryResult, eventResult]);

      await recall({ token_budget: 1 });

      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          message: `User has recalled 0 result(s) from [session_events, session_memory] of user [id=${USER_ID}]`,
        })
      );
    });

    it('does not audit a successful recall from AI indices only', async () => {
      await recall({ include: ['ai_index:*'] });

      expect(auditLogger.log).not.toHaveBeenCalled();
    });

    it('does not audit a failed recall from AI indices only', async () => {
      retrieveAiIndicesMock.mockRejectedValue(new Error('search failed'));

      await expect(recall({ include: ['ai_index:*'] })).rejects.toThrow('search failed');
      expect(auditLogger.log).not.toHaveBeenCalled();
    });

    it('audits and rethrows when a retriever fails', async () => {
      const failure = new TypeError('search failed');
      retrieveSessionMemoriesMock.mockRejectedValue(failure);

      await expect(recall()).rejects.toBe(failure);
      expect(auditLogger.log).toHaveBeenCalledTimes(1);
      expect(auditLogger.log).toHaveBeenCalledWith({
        message: `Failed attempt to recall from [session_events, session_memory] of user [id=${USER_ID}]`,
        event: {
          action: 'memory_recall',
          category: ['database'],
          type: ['access'],
          outcome: 'failure',
        },
        user: { target: { id: USER_ID } },
        error: { code: 'TypeError', message: 'search failed' },
      });
    });

    it('audits and rethrows a non-Error thrown by the reranker', async () => {
      reranker.rerank.mockRejectedValue('rerank unavailable');

      await expect(recall({ include: ['session_events'] })).rejects.toBe('rerank unavailable');
      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          message: `Failed attempt to recall from [session_events] of user [id=${USER_ID}]`,
          event: expect.objectContaining({ outcome: 'failure' }),
          error: { code: 'Error', message: 'rerank unavailable' },
        })
      );
    });
  });
});

describe('memoryRecallAuditEvent', () => {
  it('omits the target user when none is given', () => {
    expect(memoryRecallAuditEvent({ stores: ['session_memory'], results: 3 })).toEqual({
      message: 'User has recalled 3 result(s) from [session_memory]',
      event: {
        action: 'memory_recall',
        category: ['database'],
        type: ['access'],
        outcome: 'success',
      },
      error: undefined,
    });
  });

  it('defaults the result count to zero', () => {
    expect(memoryRecallAuditEvent({ stores: ['session_events'] }).message).toBe(
      'User has recalled 0 result(s) from [session_events]'
    );
  });
});
