/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { loggerMock } from '@kbn/logging-mocks';
import { isSmlRuleNotFoundError } from '@kbn/agent-builder-common';
import { createSmlRulesService } from './sml_rules_service';
import type { SmlRulesClient } from './types';
import type { SmlRuleCreateBody } from '../../../common/http_api/sml_rules';

// --- Mock the storage adapter ---

const mockIndex = jest.fn();
const mockGet = jest.fn();
const mockSearch = jest.fn();
const mockDelete = jest.fn();

const mockGetClient = jest.fn().mockReturnValue({
  index: mockIndex,
  get: mockGet,
  search: mockSearch,
  delete: mockDelete,
});

jest.mock('./storage', () => ({
  createSmlRulesStorage: jest.fn().mockReturnValue({
    getClient: () => mockGetClient(),
  }),
}));

// --- Helpers ---

const createNotFoundError = () =>
  new errors.ResponseError({
    statusCode: 404,
    body: { error: { type: 'index_not_found_exception' } },
    warnings: [],
    headers: {},
    meta: {} as any,
  });

const createMockLogger = () => {
  const log = loggerMock.create();
  log.get = jest.fn().mockReturnValue(log);
  return log;
};

const mockEsClient = {} as any;
const mockRequest = {} as any;

const mockElasticsearch = {
  client: {
    asScoped: jest.fn().mockReturnValue({
      asInternalUser: mockEsClient,
    }),
  },
} as any;

const sampleRuleBody: SmlRuleCreateBody = {
  name: 'Test Rule',
  type: 'index',
  index_pattern: 'search-confluence-*',
  inference_id: 'my-llm-endpoint',
  prompt: 'Summarize ${variables.mappings}',
  variables: {
    Mappings: { type: 'index', input: '_mapping' },
    'Sample data': { type: 'esql', input: 'FROM search-confluence-* | LIMIT 10' },
  },
};

describe('SmlRulesService', () => {
  let client: SmlRulesClient;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-01T00:00:00.000Z'));
    const service = createSmlRulesService({
      logger: createMockLogger(),
      elasticsearch: mockElasticsearch,
    });
    client = service.getScopedClient({ request: mockRequest });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('createOrUpdate', () => {
    it('creates a new rule when it does not exist', async () => {
      mockGet.mockRejectedValueOnce(createNotFoundError());
      mockIndex.mockResolvedValueOnce({ result: 'created' });

      const result = await client.createOrUpdate('rule-1', sampleRuleBody);

      expect(result).toEqual({
        ...sampleRuleBody,
        id: 'rule-1',
        created_at: '2026-04-01T00:00:00.000Z',
        updated_at: '2026-04-01T00:00:00.000Z',
      });

      expect(mockIndex).toHaveBeenCalledWith({
        id: 'rule-1',
        document: expect.objectContaining({
          id: 'rule-1',
          name: 'Test Rule',
          created_at: '2026-04-01T00:00:00.000Z',
          updated_at: '2026-04-01T00:00:00.000Z',
        }),
      });
    });

    it('preserves created_at when updating an existing rule', async () => {
      mockGet.mockResolvedValueOnce({
        _source: {
          ...sampleRuleBody,
          id: 'rule-1',
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
        },
      });
      mockIndex.mockResolvedValueOnce({ result: 'updated' });

      const updatedBody = { ...sampleRuleBody, name: 'Updated Rule' };
      const result = await client.createOrUpdate('rule-1', updatedBody);

      expect(result.created_at).toBe('2026-01-01T00:00:00.000Z');
      expect(result.updated_at).toBe('2026-04-01T00:00:00.000Z');
      expect(result.name).toBe('Updated Rule');
    });

    it('propagates non-404 errors from get', async () => {
      mockGet.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(client.createOrUpdate('rule-1', sampleRuleBody)).rejects.toThrow(
        'Connection refused'
      );
    });
  });

  describe('get', () => {
    it('returns the rule when found', async () => {
      const storedRule = {
        ...sampleRuleBody,
        id: 'rule-1',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      };
      mockGet.mockResolvedValueOnce({ _source: storedRule });

      const result = await client.get('rule-1');

      expect(result).toEqual(storedRule);
    });

    it('throws smlRuleNotFound when rule does not exist', async () => {
      mockGet.mockRejectedValueOnce(createNotFoundError());

      try {
        await client.get('nonexistent');
        fail('Expected error to be thrown');
      } catch (error) {
        expect(isSmlRuleNotFoundError(error)).toBe(true);
      }
    });

    it('throws smlRuleNotFound when _source is missing', async () => {
      mockGet.mockResolvedValueOnce({ _source: undefined });

      try {
        await client.get('rule-1');
        fail('Expected error to be thrown');
      } catch (error) {
        expect(isSmlRuleNotFoundError(error)).toBe(true);
      }
    });

    it('propagates non-404 errors', async () => {
      mockGet.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(client.get('rule-1')).rejects.toThrow('Connection refused');
    });
  });

  describe('list', () => {
    it('returns all rules', async () => {
      const rule1 = {
        ...sampleRuleBody,
        id: 'rule-1',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      };
      const rule2 = {
        ...sampleRuleBody,
        id: 'rule-2',
        name: 'Second Rule',
        created_at: '2026-02-01T00:00:00.000Z',
        updated_at: '2026-02-01T00:00:00.000Z',
      };

      mockSearch.mockResolvedValueOnce({
        hits: {
          hits: [{ _source: rule1 }, { _source: rule2 }],
        },
      });

      const result = await client.list();

      expect(result).toEqual([rule1, rule2]);
      expect(mockSearch).toHaveBeenCalledWith({
        track_total_hits: false,
        size: 1000,
        query: { match_all: {} },
      });
    });

    it('returns empty array when no rules exist', async () => {
      mockSearch.mockResolvedValueOnce({
        hits: { hits: [] },
      });

      const result = await client.list();

      expect(result).toEqual([]);
    });

    it('filters out hits with missing _source', async () => {
      mockSearch.mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _source: {
                ...sampleRuleBody,
                id: 'rule-1',
                created_at: '2026-01-01T00:00:00.000Z',
                updated_at: '2026-01-01T00:00:00.000Z',
              },
            },
            { _source: undefined },
          ],
        },
      });

      const result = await client.list();

      expect(result).toHaveLength(1);
    });
  });

  describe('delete', () => {
    it('returns true when rule is deleted', async () => {
      mockDelete.mockResolvedValueOnce({ result: 'deleted' });

      const result = await client.delete('rule-1');

      expect(result).toBe(true);
      expect(mockDelete).toHaveBeenCalledWith({ id: 'rule-1' });
    });

    it('throws smlRuleNotFound when rule does not exist', async () => {
      mockDelete.mockRejectedValueOnce(createNotFoundError());

      try {
        await client.delete('nonexistent');
        fail('Expected error to be thrown');
      } catch (error) {
        expect(isSmlRuleNotFoundError(error)).toBe(true);
      }
    });

    it('propagates non-404 errors', async () => {
      mockDelete.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(client.delete('rule-1')).rejects.toThrow('Connection refused');
    });
  });
});
