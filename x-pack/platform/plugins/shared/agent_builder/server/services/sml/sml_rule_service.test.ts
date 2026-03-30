/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { httpServerMock } from '@kbn/core/server/mocks';
import { errors } from '@elastic/elasticsearch';
import type { DiagnosticResult } from '@elastic/elasticsearch';
import { createSmlRuleService, SmlRuleNotFoundError } from './sml_rule_service';
import type { SmlRuleService } from './sml_rule_service';

const createNotFoundError = () =>
  new errors.ResponseError({
    statusCode: 404,
    body: 'resource_not_found_exception',
    warnings: [],
    meta: {
      aborted: false,
      attempts: 1,
      connection: null,
      context: null,
      name: 'resource_not_found_exception',
      request: {} as unknown as DiagnosticResult['meta']['request'],
    },
  });

const createMockStorageClient = () => ({
  index: jest.fn().mockResolvedValue({ _id: 'test', result: 'created' }),
  search: jest.fn().mockResolvedValue({
    hits: { hits: [], total: { value: 0, relation: 'eq' } },
  }),
  get: jest.fn().mockRejectedValue(createNotFoundError()),
  delete: jest.fn().mockResolvedValue({ acknowledged: true, result: 'deleted' }),
  bulk: jest.fn(),
  clean: jest.fn(),
  existsIndex: jest.fn(),
});

jest.mock('./sml_rule_storage', () => ({
  createSmlRuleStorage: jest.fn(() => ({
    getClient: () => mockClient,
  })),
}));

let mockClient: ReturnType<typeof createMockStorageClient>;

describe('SmlRuleService', () => {
  let service: SmlRuleService;
  let logger: ReturnType<typeof loggerMock.create>;
  const request = httpServerMock.createKibanaRequest();

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = createMockStorageClient();
    logger = loggerMock.create();
    logger.get = jest.fn().mockReturnValue(logger);

    service = createSmlRuleService({
      logger,
      elasticsearch: {
        client: { asInternalUser: {} as any },
      },
      spaces: undefined,
    });
  });

  describe('createOrUpdate', () => {
    const body = {
      name: 'Test Rule',
      index_pattern: 'logs-*',
      prompt: 'Summarize ${index_pattern}',
      inference_id: 'my-endpoint',
    };

    it('creates a new rule', async () => {
      const rule = await service.createOrUpdate({
        type: 'index',
        ruleId: 'rule-1',
        body,
        request,
      });

      expect(rule.id).toBe('rule-1');
      expect(rule.name).toBe('Test Rule');
      expect(rule.type).toBe('index');
      expect(rule.index_pattern).toBe('logs-*');
      expect(rule.prompt).toBe('Summarize ${index_pattern}');
      expect(rule.inference_id).toBe('my-endpoint');
      expect(rule.space).toBe('default');
      expect(rule.created_at).toBeDefined();
      expect(rule.updated_at).toBeDefined();
      expect(rule.created_at).toBe(rule.updated_at);

      expect(mockClient.index).toHaveBeenCalledWith({
        id: 'index:rule-1',
        document: expect.objectContaining({ id: 'rule-1', type: 'index' }),
      });
    });

    it('preserves created_at on update', async () => {
      const existingCreatedAt = '2026-01-01T00:00:00.000Z';
      mockClient.get.mockResolvedValueOnce({
        _id: 'index:rule-1',
        _index: 'test',
        found: true,
        _source: { created_at: existingCreatedAt },
      });

      const rule = await service.createOrUpdate({
        type: 'index',
        ruleId: 'rule-1',
        body,
        request,
      });

      expect(rule.created_at).toBe(existingCreatedAt);
      expect(rule.updated_at).not.toBe(existingCreatedAt);
    });

    it('stores variables when provided', async () => {
      const bodyWithVars = {
        ...body,
        variables: {
          sample: { type: 'esql' as const, input: 'FROM logs-* | LIMIT 10' },
        },
      };

      const rule = await service.createOrUpdate({
        type: 'index',
        ruleId: 'rule-1',
        body: bodyWithVars,
        request,
      });

      expect(rule.variables).toEqual({
        sample: { type: 'esql', input: 'FROM logs-* | LIMIT 10' },
      });
    });
  });

  describe('get', () => {
    it('returns a rule when found', async () => {
      const doc = {
        id: 'rule-1',
        name: 'Test',
        type: 'index',
        index_pattern: 'logs-*',
        prompt: 'test',
        inference_id: 'ep',
        space: 'default',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      };
      mockClient.search.mockResolvedValueOnce({
        hits: { hits: [{ _id: 'index:rule-1', _source: doc }] },
      });

      const rule = await service.get({ type: 'index', ruleId: 'rule-1', request });

      expect(rule.id).toBe('rule-1');
      expect(rule.name).toBe('Test');
    });

    it('throws SmlRuleNotFoundError when not found', async () => {
      mockClient.search.mockResolvedValueOnce({
        hits: { hits: [] },
      });

      await expect(service.get({ type: 'index', ruleId: 'nonexistent', request })).rejects.toThrow(
        SmlRuleNotFoundError
      );
    });
  });

  describe('list', () => {
    it('returns rules filtered by type and space', async () => {
      const docs = [
        {
          _id: 'index:rule-1',
          _source: {
            id: 'rule-1',
            name: 'Rule 1',
            type: 'index',
            index_pattern: 'logs-*',
            prompt: 'p1',
            inference_id: 'ep',
            space: 'default',
            created_at: '2026-01-01T00:00:00.000Z',
            updated_at: '2026-01-02T00:00:00.000Z',
          },
        },
        {
          _id: 'index:rule-2',
          _source: {
            id: 'rule-2',
            name: 'Rule 2',
            type: 'index',
            index_pattern: '*',
            prompt: 'p2',
            inference_id: 'ep',
            space: 'default',
            created_at: '2026-01-01T00:00:00.000Z',
            updated_at: '2026-01-01T00:00:00.000Z',
          },
        },
      ];
      mockClient.search.mockResolvedValueOnce({
        hits: { hits: docs, total: { value: 2, relation: 'eq' } },
      });

      const rules = await service.list({ type: 'index', request });

      expect(rules).toHaveLength(2);
      expect(rules[0].id).toBe('rule-1');
      expect(rules[1].id).toBe('rule-2');

      expect(mockClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: {
            bool: {
              filter: [{ term: { type: 'index' } }, { term: { space: 'default' } }],
            },
          },
        })
      );
    });

    it('returns empty array when no rules exist', async () => {
      mockClient.search.mockResolvedValueOnce({
        hits: { hits: [], total: { value: 0, relation: 'eq' } },
      });

      const rules = await service.list({ type: 'index', request });
      expect(rules).toHaveLength(0);
    });
  });

  describe('delete', () => {
    it('deletes a rule when found', async () => {
      mockClient.search.mockResolvedValueOnce({
        hits: {
          hits: [{ _id: 'index:rule-1', _source: { id: 'rule-1' } }],
        },
      });

      const result = await service.delete({ type: 'index', ruleId: 'rule-1', request });

      expect(result.success).toBe(true);
      expect(mockClient.delete).toHaveBeenCalledWith({ id: 'index:rule-1' });
    });

    it('throws SmlRuleNotFoundError when rule does not exist', async () => {
      mockClient.search.mockResolvedValueOnce({
        hits: { hits: [] },
      });

      await expect(
        service.delete({ type: 'index', ruleId: 'nonexistent', request })
      ).rejects.toThrow(SmlRuleNotFoundError);

      expect(mockClient.delete).not.toHaveBeenCalled();
    });
  });
});
