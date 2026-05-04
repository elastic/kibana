/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import type { RuleAttachmentData } from '@kbn/alerting-v2-schemas';
import {
  executeRuleOperations,
  RuleOperationValidationError,
  type RuleOperation,
} from './operations';

const createMockEsClient = () => elasticsearchServiceMock.createScopedClusterClient();

describe('executeRuleOperations', () => {
  describe('set_query with ES|QL validation', () => {
    it('validates a valid query against ES and stores the result', async () => {
      const esClient = createMockEsClient();
      esClient.asCurrentUser.esql.query.mockResolvedValueOnce({
        columns: [
          { name: 'host.name', type: 'keyword' },
          { name: 'cpu', type: 'double' },
        ],
        values: [],
      } as never);

      const ops: RuleOperation[] = [
        { operation: 'set_query', base: 'FROM metrics-* | STATS avg(cpu) BY host.name' },
      ];

      const result = await executeRuleOperations({}, ops, esClient);

      expect(esClient.asCurrentUser.esql.query).toHaveBeenCalledWith({
        query: 'FROM metrics-* | STATS avg(cpu) BY host.name | LIMIT 0',
        format: 'json',
      });
      expect(result.evaluation?.query?.base).toBe('FROM metrics-* | STATS avg(cpu) BY host.name');
    });

    it('throws with the ES error message when the query is invalid', async () => {
      const esClient = createMockEsClient();
      esClient.asCurrentUser.esql.query.mockRejectedValueOnce(
        new Error('Unknown index [nonexistent-*]')
      );

      const ops: RuleOperation[] = [
        { operation: 'set_query', base: 'FROM nonexistent-* | STATS COUNT(*)' },
      ];

      await expect(executeRuleOperations({}, ops, esClient)).rejects.toThrow(
        'Invalid ES|QL query: Unknown index [nonexistent-*]'
      );
    });

    it('skips validation when esClient is not provided', async () => {
      const ops: RuleOperation[] = [
        { operation: 'set_query', base: 'FROM metrics-* | STATS COUNT(*)' },
      ];

      const result = await executeRuleOperations({}, ops);

      expect(result.evaluation?.query?.base).toBe('FROM metrics-* | STATS COUNT(*)');
    });
  });

  describe('set_grouping with column validation', () => {
    it('accepts grouping fields that exist in query columns', async () => {
      const esClient = createMockEsClient();
      esClient.asCurrentUser.esql.query.mockResolvedValueOnce({
        columns: [
          { name: 'host.name', type: 'keyword' },
          { name: 'cpu', type: 'double' },
        ],
        values: [],
      } as never);

      const ops: RuleOperation[] = [
        { operation: 'set_query', base: 'FROM metrics-* | STATS avg(cpu) BY host.name' },
        { operation: 'set_grouping', fields: ['host.name'] },
      ];

      const result = await executeRuleOperations({}, ops, esClient);

      expect(result.grouping?.fields).toEqual(['host.name']);
    });

    it('throws when grouping fields are not in query columns', async () => {
      const esClient = createMockEsClient();
      esClient.asCurrentUser.esql.query.mockResolvedValueOnce({
        columns: [
          { name: 'host.name', type: 'keyword' },
          { name: 'cpu', type: 'double' },
        ],
        values: [],
      } as never);

      const ops: RuleOperation[] = [
        { operation: 'set_query', base: 'FROM metrics-* | STATS avg(cpu) BY host.name' },
        { operation: 'set_grouping', fields: ['service.name'] },
      ];

      await expect(executeRuleOperations({}, ops, esClient)).rejects.toThrow(
        'Grouping fields not found in query output columns: service.name'
      );
    });

    it('skips column validation when no prior query validation ran', async () => {
      const ops: RuleOperation[] = [{ operation: 'set_grouping', fields: ['service.name'] }];

      const result = await executeRuleOperations({}, ops);

      expect(result.grouping?.fields).toEqual(['service.name']);
    });
  });

  describe('cross-field validation', () => {
    it('throws when isNew is true and no name is provided', async () => {
      const ops: RuleOperation[] = [{ operation: 'set_kind', kind: 'alert' }];

      await expect(executeRuleOperations({}, ops, undefined, { isNew: true })).rejects.toThrow(
        'A rule name is required when creating a new rule. Use a set_metadata operation with a name.'
      );
    });

    it('does not throw when isNew is true and a name is provided', async () => {
      const ops: RuleOperation[] = [{ operation: 'set_metadata', name: 'My Rule' }];

      const result = await executeRuleOperations({}, ops, undefined, { isNew: true });

      expect(result.metadata?.name).toBe('My Rule');
    });

    it('throws when state_transition is set on a non-alert kind', async () => {
      const ops: RuleOperation[] = [
        { operation: 'set_kind', kind: 'signal' },
        {
          operation: 'set_state_transition',
          pending_count: 3,
          pending_timeframe: '5m',
          recovering_count: 2,
          recovering_timeframe: '5m',
        },
      ];

      await expect(executeRuleOperations({}, ops)).rejects.toThrow(
        'state_transition is only allowed when kind is "alert"'
      );
    });

    it('throws when recovery_policy type is query but no query is provided', async () => {
      const ops: RuleOperation[] = [{ operation: 'set_recovery_policy', type: 'query' }];

      await expect(executeRuleOperations({}, ops)).rejects.toThrow(
        'recovery_policy.query.base is required when recovery_policy.type is "query"'
      );
    });
  });

  describe('validation error class', () => {
    const expectValidationError = async (promise: Promise<unknown>) => {
      await expect(promise).rejects.toBeInstanceOf(RuleOperationValidationError);
    };

    it('wraps invalid ES|QL errors', async () => {
      const esClient = createMockEsClient();
      esClient.asCurrentUser.esql.query.mockRejectedValueOnce(new Error('boom'));
      await expectValidationError(
        executeRuleOperations({}, [{ operation: 'set_query', base: 'FROM x' }], esClient)
      );
    });

    it('wraps unknown grouping fields', async () => {
      const esClient = createMockEsClient();
      esClient.asCurrentUser.esql.query.mockResolvedValueOnce({
        columns: [{ name: 'foo', type: 'keyword' }],
        values: [],
      } as never);
      await expectValidationError(
        executeRuleOperations(
          {},
          [
            { operation: 'set_query', base: 'FROM x' },
            { operation: 'set_grouping', fields: ['bar'] },
          ],
          esClient
        )
      );
    });

    it('wraps missing-name error on new rule', async () => {
      await expectValidationError(
        executeRuleOperations({}, [{ operation: 'set_kind', kind: 'alert' }], undefined, {
          isNew: true,
        })
      );
    });

    it('wraps state_transition on non-alert kind', async () => {
      await expectValidationError(
        executeRuleOperations({}, [
          { operation: 'set_kind', kind: 'signal' },
          { operation: 'set_state_transition', pending_count: 1 },
        ])
      );
    });

    it('wraps recovery_policy missing query', async () => {
      await expectValidationError(
        executeRuleOperations({}, [{ operation: 'set_recovery_policy', type: 'query' }])
      );
    });
  });

  describe('basic operations without ES client', () => {
    it('applies set_metadata', async () => {
      const ops: RuleOperation[] = [
        { operation: 'set_metadata', name: 'Test Rule', description: 'A test', tags: ['test'] },
      ];

      const result = await executeRuleOperations({}, ops);

      expect(result.metadata).toEqual({
        name: 'Test Rule',
        description: 'A test',
        tags: ['test'],
      });
    });

    it('merges metadata with existing data', async () => {
      const existing: Partial<RuleAttachmentData> = {
        metadata: { name: 'Old Name', description: 'Old desc' },
      };
      const ops: RuleOperation[] = [{ operation: 'set_metadata', name: 'New Name' }];

      const result = await executeRuleOperations(existing, ops);

      expect(result.metadata?.name).toBe('New Name');
      expect(result.metadata?.description).toBe('Old desc');
    });

    it('applies set_kind', async () => {
      const ops: RuleOperation[] = [{ operation: 'set_kind', kind: 'alert' }];

      const result = await executeRuleOperations({}, ops);

      expect(result.kind).toBe('alert');
    });

    it('applies set_schedule', async () => {
      const ops: RuleOperation[] = [{ operation: 'set_schedule', every: '1m', lookback: '5m' }];

      const result = await executeRuleOperations({}, ops);

      expect(result.schedule).toEqual({ every: '1m', lookback: '5m' });
    });
  });
});
