/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { RuleAttachmentData } from '@kbn/alerting-v2-schemas';
import { RUNBOOK_CONTENT_LIMIT } from '@kbn/alerting-v2-constants';
import {
  executeRuleOperations as executeRuleOperationsImpl,
  RuleOperationValidationError,
  ruleOperationSchema,
  type RuleOperation,
} from './operations';
import { AGENT_BUILDER_TAG } from '../../common/constants';

const createMockEsClient = () => {
  const esClient = elasticsearchServiceMock.createScopedClusterClient();
  // Default index exposes `@timestamp`; resolution/validation tests override this.
  esClient.asCurrentUser.fieldCaps.mockResolvedValue({
    fields: { '@timestamp': { date: {} } },
  } as never);
  return esClient;
};

const createMockSoClient = (existingIds?: string[]): jest.Mocked<SavedObjectsClientContract> => {
  const soClient = savedObjectsClientMock.create();
  soClient.bulkGet.mockImplementation(async (objects) => ({
    saved_objects: objects.map((obj) =>
      existingIds === undefined || existingIds.includes(obj.id)
        ? { id: obj.id, type: obj.type, attributes: {}, references: [] }
        : {
            id: obj.id,
            type: obj.type,
            error: {
              statusCode: 404,
              error: 'Not Found',
              message: `Saved object [dashboard/${obj.id}] not found`,
            },
            attributes: {},
            references: [],
          }
    ),
  }));
  return soClient;
};

const executeRuleOperations = (
  data: Partial<RuleAttachmentData>,
  operations: RuleOperation[],
  esClient?: IScopedClusterClient,
  savedObjectsClient: SavedObjectsClientContract = createMockSoClient(),
  options: { isNew?: boolean } = {}
) => executeRuleOperationsImpl(data, operations, esClient, savedObjectsClient, options);

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
        {
          operation: 'set_query',
          query: { base: 'FROM metrics-* | STATS avg(cpu) BY host.name' },
        },
      ];

      const result = await executeRuleOperations({}, ops, esClient);

      expect(esClient.asCurrentUser.esql.query).toHaveBeenCalledWith({
        query: 'FROM metrics-* | STATS avg(cpu) BY host.name | LIMIT 0',
        format: 'json',
      });
      expect(result.data.query).toEqual({
        base: 'FROM metrics-* | STATS avg(cpu) BY host.name',
      });
      expect(result.queryColumns).toEqual([
        { name: 'host.name', type: 'keyword' },
        { name: 'cpu', type: 'double' },
      ]);
    });

    it('resolves the time field from the source index instead of defaulting to @timestamp', async () => {
      const esClient = createMockEsClient();
      esClient.asCurrentUser.esql.query.mockResolvedValueOnce({
        columns: [{ name: 'timestamp', type: 'date' }],
        values: [],
      } as never);
      esClient.asCurrentUser.fieldCaps.mockResolvedValueOnce({
        fields: { timestamp: { date: {} } },
      } as never);

      const ops: RuleOperation[] = [
        {
          operation: 'set_query',
          query: { base: 'FROM kibana_sample_data_flights | STATS COUNT(*)' },
        },
      ];

      const result = await executeRuleOperations({}, ops, esClient);

      expect(result.data.time_field).toBe('timestamp');
    });

    it('re-resolves a stale stored time field to an available one on the edit path', async () => {
      const esClient = createMockEsClient();
      esClient.asCurrentUser.esql.query.mockResolvedValueOnce({
        columns: [{ name: 'timestamp', type: 'date' }],
        values: [],
      } as never);
      esClient.asCurrentUser.fieldCaps.mockResolvedValueOnce({
        fields: { timestamp: { date: {} } },
      } as never);

      const ops: RuleOperation[] = [
        {
          operation: 'set_query',
          query: { base: 'FROM kibana_sample_data_flights | STATS COUNT(*)' },
        },
      ];

      // Stored rule points at `@timestamp`, but the newly-targeted index only has
      // `timestamp` — resolution should pick it instead of throwing.
      const result = await executeRuleOperations({ time_field: '@timestamp' }, ops, esClient);

      expect(result.data.time_field).toBe('timestamp');
    });

    it('throws a validation error when the index has no usable date field', async () => {
      const esClient = createMockEsClient();
      esClient.asCurrentUser.esql.query.mockResolvedValue({
        columns: [{ name: 'cpu', type: 'double' }],
        values: [],
      } as never);
      esClient.asCurrentUser.fieldCaps.mockResolvedValue({ fields: {} } as never);

      const ops: RuleOperation[] = [
        {
          operation: 'set_query',
          query: { base: 'FROM metrics-* | STATS avg(cpu)' },
        },
      ];

      await expect(executeRuleOperations({}, ops, esClient)).rejects.toThrow(
        RuleOperationValidationError
      );
      await expect(executeRuleOperations({}, ops, esClient)).rejects.toThrow(
        /Could not determine a time field/
      );
    });

    it('throws when the time field cannot be looked up and none is set', async () => {
      const esClient = createMockEsClient();
      esClient.asCurrentUser.esql.query.mockResolvedValue({
        columns: [{ name: 'cpu', type: 'double' }],
        values: [],
      } as never);
      // fieldCaps failing yields an unresolved (`undefined`) time field.
      esClient.asCurrentUser.fieldCaps.mockRejectedValue(new Error('boom'));

      const ops: RuleOperation[] = [
        {
          operation: 'set_query',
          query: { base: 'FROM metrics-* | STATS avg(cpu)' },
        },
      ];

      await expect(executeRuleOperations({}, ops, esClient)).rejects.toThrow(
        RuleOperationValidationError
      );
      await expect(executeRuleOperations({}, ops, esClient)).rejects.toThrow(
        /Could not determine a time field for the query and none is set/
      );
    });

    it('keeps the existing time field when it cannot be looked up but one is already set', async () => {
      const esClient = createMockEsClient();
      esClient.asCurrentUser.esql.query.mockResolvedValue({
        columns: [{ name: 'cpu', type: 'double' }],
        values: [],
      } as never);
      esClient.asCurrentUser.fieldCaps.mockRejectedValue(new Error('boom'));

      const ops: RuleOperation[] = [
        {
          operation: 'set_query',
          query: { base: 'FROM metrics-* | STATS avg(cpu)' },
        },
      ];

      const result = await executeRuleOperations({ time_field: 'event.ingested' }, ops, esClient);

      expect(result.data.time_field).toBe('event.ingested');
    });

    it('throws with the ES error message when the query is invalid', async () => {
      const esClient = createMockEsClient();
      esClient.asCurrentUser.esql.query.mockRejectedValueOnce(
        new Error('Unknown index [nonexistent-*]')
      );

      const ops: RuleOperation[] = [
        {
          operation: 'set_query',
          query: { base: 'FROM nonexistent-* | STATS COUNT(*)' },
        },
      ];

      await expect(executeRuleOperations({}, ops, esClient)).rejects.toThrow(
        'Invalid ES|QL query: Unknown index [nonexistent-*]'
      );
    });

    it('skips validation when esClient is not provided', async () => {
      const ops: RuleOperation[] = [
        {
          operation: 'set_query',
          query: { base: 'FROM metrics-* | STATS COUNT(*)' },
        },
      ];

      const result = await executeRuleOperations({}, ops);

      expect(result.data.query).toEqual({ base: 'FROM metrics-* | STATS COUNT(*)' });
      expect(result.queryColumns).toBeUndefined();
    });

    it('stores a no_breach recovery on the rule data', async () => {
      const ops: RuleOperation[] = [
        {
          operation: 'set_query',
          query: { base: 'FROM metrics-* | STATS COUNT(*)' },
          recovery: { strategy: 'no_breach' },
        },
      ];

      const result = await executeRuleOperations({}, ops);

      expect(result.data.recovery).toEqual({ strategy: 'no_breach' });
    });

    it('stores a query recovery with its own ES|QL', async () => {
      const ops: RuleOperation[] = [
        {
          operation: 'set_query',
          query: { base: 'FROM metrics-* | WHERE cpu > 0.9' },
          recovery: { strategy: 'query', query: 'FROM metrics-* | WHERE cpu < 0.5' },
        },
      ];

      const result = await executeRuleOperations({}, ops);

      expect(result.data.recovery).toEqual({
        strategy: 'query',
        query: 'FROM metrics-* | WHERE cpu < 0.5',
      });
    });

    it('stores a condition recovery with its segment', async () => {
      const ops: RuleOperation[] = [
        {
          operation: 'set_query',
          query: { base: 'FROM metrics-*', breach: { segment: 'WHERE cpu > 0.9' } },
          recovery: { strategy: 'condition', segment: 'WHERE cpu < 0.5' },
        },
      ];

      const result = await executeRuleOperations({}, ops);

      expect(result.data.recovery).toEqual({
        strategy: 'condition',
        segment: 'WHERE cpu < 0.5',
      });
    });

    it('stores a no_data object with its presence query', async () => {
      const ops: RuleOperation[] = [
        {
          operation: 'set_query',
          query: { base: 'FROM metrics-* | WHERE cpu > 0.9' },
          no_data: {
            strategy: 'keep_last',
            query: 'FROM heartbeat-* | STATS COUNT(*) BY host.name',
          },
        },
      ];

      const result = await executeRuleOperations({}, ops);

      expect(result.data.no_data).toEqual({
        strategy: 'keep_last',
        query: 'FROM heartbeat-* | STATS COUNT(*) BY host.name',
      });
    });

    it('stores the alert no-data strategy', async () => {
      const ops: RuleOperation[] = [
        {
          operation: 'set_query',
          query: { base: 'FROM metrics-* | WHERE cpu > 0.9' },
          no_data: { strategy: 'alert' },
        },
      ];

      const result = await executeRuleOperations({}, ops);

      expect(result.data.no_data).toEqual({ strategy: 'alert' });
    });

    it('does not set recovery or no_data when omitted from set_query', async () => {
      const ops: RuleOperation[] = [
        {
          operation: 'set_query',
          query: { base: 'FROM metrics-* | STATS COUNT(*)' },
        },
      ];

      const result = await executeRuleOperations({}, ops);

      expect(result.data.recovery).toBeUndefined();
      expect(result.data.no_data).toBeUndefined();
    });

    it('preserves an existing recovery when a subsequent set_query omits it', async () => {
      const existing: Partial<RuleAttachmentData> = { recovery: { strategy: 'no_breach' } };
      const ops: RuleOperation[] = [
        {
          operation: 'set_query',
          query: { base: 'FROM metrics-* | STATS COUNT(*)' },
        },
      ];

      const result = await executeRuleOperations(existing, ops);

      expect(result.data.recovery).toEqual({ strategy: 'no_breach' });
    });
  });

  describe('set_query with a breach segment', () => {
    it('validates the base query alone in the LIMIT 0 call', async () => {
      const esClient = createMockEsClient();
      esClient.asCurrentUser.esql.query.mockResolvedValueOnce({
        columns: [
          { name: 'host.name', type: 'keyword' },
          { name: 'avg_cpu', type: 'double' },
        ],
        values: [],
      } as never);

      const ops: RuleOperation[] = [
        {
          operation: 'set_query',
          query: {
            base: 'FROM metrics-* | STATS avg_cpu = AVG(cpu) BY host.name',
            breach: { segment: 'WHERE avg_cpu > 0.9' },
          },
        },
      ];

      const result = await executeRuleOperations({}, ops, esClient);

      expect(esClient.asCurrentUser.esql.query).toHaveBeenCalledWith({
        query: 'FROM metrics-* | STATS avg_cpu = AVG(cpu) BY host.name | LIMIT 0',
        format: 'json',
      });
      expect(result.data.query).toEqual({
        base: 'FROM metrics-* | STATS avg_cpu = AVG(cpu) BY host.name',
        breach: { segment: 'WHERE avg_cpu > 0.9' },
      });
      expect(result.queryColumns).toEqual([
        { name: 'host.name', type: 'keyword' },
        { name: 'avg_cpu', type: 'double' },
      ]);
    });

    it('stores a breach segment alongside a condition recovery segment', async () => {
      const ops: RuleOperation[] = [
        {
          operation: 'set_query',
          query: {
            base: 'FROM metrics-* | STATS avg_cpu = AVG(cpu) BY host.name',
            breach: { segment: 'WHERE avg_cpu > 0.9' },
          },
          recovery: { strategy: 'condition', segment: 'WHERE avg_cpu < 0.5' },
        },
      ];

      const result = await executeRuleOperations({}, ops);

      expect(result.data.query).toEqual({
        base: 'FROM metrics-* | STATS avg_cpu = AVG(cpu) BY host.name',
        breach: { segment: 'WHERE avg_cpu > 0.9' },
      });
      expect(result.data.recovery).toEqual({
        strategy: 'condition',
        segment: 'WHERE avg_cpu < 0.5',
      });
    });
  });

  describe('set_query recovery cross-field validation', () => {
    it('throws when a condition recovery has no breach segment to contrast with', async () => {
      const ops: RuleOperation[] = [
        {
          operation: 'set_query',
          query: { base: 'FROM metrics-* | WHERE cpu > 0.9' },
          recovery: { strategy: 'condition', segment: 'WHERE cpu < 0.5' },
        },
      ];

      await expect(executeRuleOperations({}, ops)).rejects.toThrow(
        'recovery.strategy "condition" requires query.breach'
      );
    });

    it('throws when a later set_query drops the breach a stored condition recovery needs', async () => {
      const existing: Partial<RuleAttachmentData> = {
        recovery: { strategy: 'condition', segment: 'WHERE cpu < 0.5' },
      };
      const ops: RuleOperation[] = [
        {
          operation: 'set_query',
          query: { base: 'FROM metrics-* | WHERE cpu > 0.9' },
        },
      ];

      await expect(executeRuleOperations(existing, ops)).rejects.toThrow(
        'recovery.strategy "condition" requires query.breach'
      );
      await expect(executeRuleOperations(existing, ops)).rejects.toBeInstanceOf(
        RuleOperationValidationError
      );
    });

    it('rejects a query recovery with no ES|QL at the operation schema', () => {
      const result = ruleOperationSchema.safeParse({
        operation: 'set_query',
        query: { base: 'FROM metrics-* | WHERE cpu > 0.9' },
        recovery: { strategy: 'query' },
      });

      expect(result.success).toBe(false);
    });

    it('rejects a condition recovery with no segment at the operation schema', () => {
      const result = ruleOperationSchema.safeParse({
        operation: 'set_query',
        query: { base: 'FROM metrics-*', breach: { segment: 'WHERE cpu > 0.9' } },
        recovery: { strategy: 'condition' },
      });

      expect(result.success).toBe(false);
    });

    it('passes when a condition recovery accompanies a breach segment', async () => {
      const ops: RuleOperation[] = [
        {
          operation: 'set_query',
          query: { base: 'FROM metrics-*', breach: { segment: 'WHERE cpu > 0.9' } },
          recovery: { strategy: 'condition', segment: 'WHERE cpu < 0.5' },
        },
      ];

      const result = await executeRuleOperations({}, ops);
      expect(result.data.recovery).toEqual({
        strategy: 'condition',
        segment: 'WHERE cpu < 0.5',
      });
    });
  });

  describe('set_query no_data cross-field validation', () => {
    it('rejects a presence query on the ignore strategy at the operation schema', () => {
      const result = ruleOperationSchema.safeParse({
        operation: 'set_query',
        query: { base: 'FROM metrics-* | WHERE cpu > 0.9' },
        no_data: { strategy: 'ignore', query: 'FROM heartbeat-*' },
      });

      expect(result.success).toBe(false);
    });

    it('accepts a classifying strategy with no presence query, falling back to the base query', async () => {
      const ops: RuleOperation[] = [
        {
          operation: 'set_query',
          query: { base: 'FROM metrics-* | WHERE cpu > 0.9' },
          no_data: { strategy: 'keep_last' },
        },
      ];

      const result = await executeRuleOperations({}, ops);

      expect(result.data.no_data).toEqual({ strategy: 'keep_last' });
    });

    it('passes when a classifying strategy carries its own presence query', async () => {
      const ops: RuleOperation[] = [
        {
          operation: 'set_query',
          query: { base: 'FROM metrics-* | WHERE cpu > 0.9' },
          no_data: {
            strategy: 'keep_last',
            query: 'FROM heartbeat-* | STATS COUNT(*) BY host.name',
          },
        },
      ];

      const result = await executeRuleOperations({}, ops);
      expect(result.data.no_data).toEqual({
        strategy: 'keep_last',
        query: 'FROM heartbeat-* | STATS COUNT(*) BY host.name',
      });
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
        {
          operation: 'set_query',
          query: { base: 'FROM metrics-* | STATS avg(cpu) BY host.name' },
        },
        { operation: 'set_grouping', fields: ['host.name'] },
      ];

      const result = await executeRuleOperations({}, ops, esClient);

      expect(result.data.grouping?.fields).toEqual(['host.name']);
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
        {
          operation: 'set_query',
          query: { base: 'FROM metrics-* | STATS avg(cpu) BY host.name' },
        },
        { operation: 'set_grouping', fields: ['service.name'] },
      ];

      await expect(executeRuleOperations({}, ops, esClient)).rejects.toThrow(
        'Grouping fields not found in query output columns: service.name'
      );
    });

    it('skips column validation when no prior query validation ran', async () => {
      const ops: RuleOperation[] = [{ operation: 'set_grouping', fields: ['service.name'] }];

      const result = await executeRuleOperations({}, ops);

      expect(result.data.grouping?.fields).toEqual(['service.name']);
    });
  });

  describe('cross-field validation', () => {
    it('throws when isNew is true and no name is provided', async () => {
      const ops: RuleOperation[] = [{ operation: 'set_kind', kind: 'alert' }];

      await expect(
        executeRuleOperations({}, ops, undefined, createMockSoClient(), { isNew: true })
      ).rejects.toThrow(
        'A rule name is required when creating a new rule. Use a set_metadata operation with a name.'
      );
    });

    it('does not throw when isNew is true and a name is provided', async () => {
      const ops: RuleOperation[] = [{ operation: 'set_metadata', name: 'My Rule' }];

      const result = await executeRuleOperations({}, ops, undefined, createMockSoClient(), {
        isNew: true,
      });

      expect(result.data.metadata?.name).toBe('My Rule');
    });
  });

  describe('agent-builder provenance tag', () => {
    it('stamps the agent-builder tag on a newly created rule', async () => {
      const ops: RuleOperation[] = [{ operation: 'set_metadata', name: 'My Rule' }];

      const result = await executeRuleOperations({}, ops, undefined, createMockSoClient(), {
        isNew: true,
      });

      expect(result.data.metadata?.tags).toEqual([AGENT_BUILDER_TAG]);
    });

    it('appends the tag without clobbering user/LLM-provided tags', async () => {
      const ops: RuleOperation[] = [
        { operation: 'set_metadata', name: 'My Rule', tags: ['production', 'cpu'] },
      ];

      const result = await executeRuleOperations({}, ops, undefined, createMockSoClient(), {
        isNew: true,
      });

      expect(result.data.metadata?.tags).toEqual(['production', 'cpu', AGENT_BUILDER_TAG]);
    });

    it('does not duplicate the tag when it is already present', async () => {
      const ops: RuleOperation[] = [
        { operation: 'set_metadata', name: 'My Rule', tags: [AGENT_BUILDER_TAG] },
      ];

      const result = await executeRuleOperations({}, ops, undefined, createMockSoClient(), {
        isNew: true,
      });

      expect(result.data.metadata?.tags).toEqual([AGENT_BUILDER_TAG]);
    });

    it('skips stamping when the 20-tag cap is already reached', async () => {
      const maxTags = Array.from({ length: 20 }, (_, i) => `tag-${i}`);
      const ops: RuleOperation[] = [{ operation: 'set_metadata', name: 'My Rule', tags: maxTags }];

      const result = await executeRuleOperations({}, ops, undefined, createMockSoClient(), {
        isNew: true,
      });

      expect(result.data.metadata?.tags).toEqual(maxTags);
      expect(result.data.metadata?.tags).toHaveLength(20);
    });

    it('stamps the tag when editing an existing rule, preserving existing tags', async () => {
      const existing: Partial<RuleAttachmentData> = {
        metadata: { name: 'Existing Rule', tags: ['cpu'] },
      };
      const ops: RuleOperation[] = [{ operation: 'set_metadata', description: 'updated' }];

      const result = await executeRuleOperations(existing, ops, undefined, createMockSoClient(), {
        isNew: false,
      });

      expect(result.data.metadata?.tags).toEqual(['cpu', AGENT_BUILDER_TAG]);
    });

    it('re-adds the tag on edit when the user previously removed it', async () => {
      const existing: Partial<RuleAttachmentData> = {
        metadata: { name: 'Existing Rule', tags: ['cpu'] },
      };
      const ops: RuleOperation[] = [{ operation: 'set_metadata', tags: ['cpu'] }];

      const result = await executeRuleOperations(existing, ops, undefined, createMockSoClient(), {
        isNew: false,
      });

      expect(result.data.metadata?.tags).toEqual(['cpu', AGENT_BUILDER_TAG]);
    });

    it('throws when state_transition is set on a non-alert kind', async () => {
      const ops: RuleOperation[] = [
        { operation: 'set_kind', kind: 'signal' },
        {
          operation: 'set_state_transition',
          pending: { count: 3, timeframe: '5m' },
          recovering: { count: 2, timeframe: '5m' },
        },
      ];

      await expect(executeRuleOperations({}, ops)).rejects.toThrow(
        'state_transition is only allowed when kind is "alert"'
      );
    });

    it('throws when a recovering delay is set under manual recovery', async () => {
      const ops: RuleOperation[] = [
        { operation: 'set_kind', kind: 'alert' },
        {
          operation: 'set_query',
          query: { base: 'FROM metrics-* | STATS COUNT(*)' },
          recovery: { strategy: 'manual' },
        },
        {
          operation: 'set_state_transition',
          pending: { count: 0 },
          recovering: { count: 2 },
        },
      ];

      await expect(executeRuleOperations({}, ops)).rejects.toThrow(
        'state_transition.recovering has no effect when recovery.strategy is "manual"'
      );
      await expect(executeRuleOperations({}, ops)).rejects.toBeInstanceOf(
        RuleOperationValidationError
      );
    });

    it('throws when a recovering count of 0 is set under manual recovery', async () => {
      const ops: RuleOperation[] = [
        { operation: 'set_kind', kind: 'alert' },
        {
          operation: 'set_query',
          query: { base: 'FROM metrics-* | STATS COUNT(*)' },
          recovery: { strategy: 'manual' },
        },
        {
          operation: 'set_state_transition',
          pending: { count: 0 },
          recovering: { count: 0 },
        },
      ];

      await expect(executeRuleOperations({}, ops)).rejects.toThrow(
        'state_transition.recovering has no effect when recovery.strategy is "manual"'
      );
      await expect(executeRuleOperations({}, ops)).rejects.toBeInstanceOf(
        RuleOperationValidationError
      );
    });

    it('allows a pending delay under manual recovery', async () => {
      const ops: RuleOperation[] = [
        { operation: 'set_kind', kind: 'alert' },
        {
          operation: 'set_query',
          query: { base: 'FROM metrics-* | STATS COUNT(*)' },
          recovery: { strategy: 'manual' },
        },
        { operation: 'set_state_transition', pending: { count: 2 } },
      ];

      const result = await executeRuleOperations({}, ops);

      expect(result.data.state_transition).toEqual({ pending: { count: 2 } });
    });

    it('throws when a signal rule sets no_data', async () => {
      const ops: RuleOperation[] = [
        { operation: 'set_kind', kind: 'signal' },
        {
          operation: 'set_query',
          query: { base: 'FROM logs-*' },
          no_data: { strategy: 'alert' },
        },
      ];

      await expect(executeRuleOperations({}, ops)).rejects.toThrow(
        'Signal rules cannot set recovery or no_data'
      );
    });

    it('throws when a signal rule has recovery set', async () => {
      const ops: RuleOperation[] = [{ operation: 'set_kind', kind: 'signal' }];
      const initial: Partial<RuleAttachmentData> = {
        recovery: { strategy: 'query', query: 'FROM logs-* | WHERE ok' },
        query: { base: 'FROM logs-* | LIMIT 1' },
      };

      await expect(executeRuleOperations(initial, ops)).rejects.toThrow(
        'Signal rules cannot set recovery or no_data'
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
        executeRuleOperations(
          {},
          [
            {
              operation: 'set_query',
              query: { base: 'FROM x' },
            },
          ],
          esClient
        )
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
            {
              operation: 'set_query',
              query: { base: 'FROM x' },
            },
            { operation: 'set_grouping', fields: ['bar'] },
          ],
          esClient
        )
      );
    });

    it('wraps missing-name error on new rule', async () => {
      await expectValidationError(
        executeRuleOperations(
          {},
          [{ operation: 'set_kind', kind: 'alert' }],
          undefined,
          createMockSoClient(),
          { isNew: true }
        )
      );
    });

    it('wraps state_transition on non-alert kind', async () => {
      await expectValidationError(
        executeRuleOperations({}, [
          { operation: 'set_kind', kind: 'signal' },
          { operation: 'set_state_transition', pending: { count: 1 } },
        ])
      );
    });

    it('wraps a condition recovery without a breach segment', async () => {
      await expectValidationError(
        executeRuleOperations({}, [
          {
            operation: 'set_query',
            query: { base: 'FROM logs-*' },
            recovery: { strategy: 'condition', segment: 'WHERE error == false' },
          },
        ])
      );
    });

    it('wraps a lifecycle object on signal kind', async () => {
      await expectValidationError(
        executeRuleOperations(
          {
            recovery: { strategy: 'query', query: 'FROM logs-* | WHERE ok' },
            query: { base: 'FROM logs-* | LIMIT 1' },
          },
          [{ operation: 'set_kind', kind: 'signal' }]
        )
      );
    });
  });

  describe('validate operation', () => {
    const validRule: Partial<RuleAttachmentData> = {
      kind: 'alert',
      metadata: { name: 'Test Rule', description: 'A test rule' },
      schedule: { every: '5m', lookback: '10m' },
      query: { base: 'FROM metrics-* | STATS COUNT(*)' },
      time_field: '@timestamp',
      state_transition: null,
    };

    it('passes validation for a complete rule', async () => {
      const ops: RuleOperation[] = [{ operation: 'validate' }];

      const result = await executeRuleOperations(validRule, ops);

      expect(result.data.kind).toBe('alert');
    });

    it('passes validation when validate follows mutation operations', async () => {
      const ops: RuleOperation[] = [
        { operation: 'set_metadata', name: 'My Rule' },
        { operation: 'set_kind', kind: 'signal' },
        { operation: 'set_schedule', every: '1m', lookback: '5m' },
        {
          operation: 'set_query',
          query: { base: 'FROM logs-* | STATS COUNT(*)' },
        },
        { operation: 'validate' },
      ];

      const result = await executeRuleOperations({}, ops);

      expect(result.data.metadata?.name).toBe('My Rule');
    });

    it('passes validation for a complete rule with dashboard artifacts', async () => {
      const ops: RuleOperation[] = [
        { operation: 'set_dashboards', dashboard_ids: ['dash-1'] },
        { operation: 'validate' },
      ];

      const result = await executeRuleOperations(validRule, ops);

      expect(result.data.artifacts).toEqual([
        {
          id: expect.stringMatching(/^dashboard-/),
          type: 'dashboard',
          data: { dashboard_id: 'dash-1' },
        },
      ]);
    });

    it('passes validation for a complete rule with a runbook artifact', async () => {
      const ops: RuleOperation[] = [
        { operation: 'set_runbook', content: '# Restart the service\n\n1. Check logs' },
        { operation: 'validate' },
      ];

      const result = await executeRuleOperations(validRule, ops);

      expect(result.data.artifacts).toEqual([
        {
          id: expect.stringMatching(/^runbook-/),
          type: 'runbook',
          data: { content: '# Restart the service\n\n1. Check logs' },
        },
      ]);
    });

    it('throws RuleOperationValidationError when kind is missing', async () => {
      const ops: RuleOperation[] = [{ operation: 'validate' }];

      await expect(
        executeRuleOperations({ metadata: { name: 'Test' }, schedule: { every: '5m' } }, ops)
      ).rejects.toThrow(RuleOperationValidationError);
    });

    it('throws when metadata is missing', async () => {
      const ops: RuleOperation[] = [{ operation: 'validate' }];

      await expect(executeRuleOperations({ kind: 'alert' }, ops)).rejects.toThrow(
        'Rule is not ready to save'
      );
    });

    it('includes Zod issue paths in the error message', async () => {
      const ops: RuleOperation[] = [{ operation: 'validate' }];

      await expect(executeRuleOperations({}, ops)).rejects.toThrow(/kind:/);
    });

    it('does not persist changes when validate throws', async () => {
      const ops: RuleOperation[] = [
        { operation: 'set_metadata', name: 'Test' },
        { operation: 'validate' },
      ];

      await expect(executeRuleOperations({}, ops)).rejects.toThrow(RuleOperationValidationError);
    });

    it('passes validation for a rule with a query recovery', async () => {
      const ops: RuleOperation[] = [{ operation: 'validate' }];

      const result = await executeRuleOperations(
        {
          ...validRule,
          recovery: { strategy: 'query', query: 'FROM metrics-* | WHERE ok == true' },
        },
        ops
      );

      expect(result.data.recovery).toEqual({
        strategy: 'query',
        query: 'FROM metrics-* | WHERE ok == true',
      });
    });

    it('passes validation for a rule with a classifying no_data strategy', async () => {
      const ops: RuleOperation[] = [{ operation: 'validate' }];

      const result = await executeRuleOperations(
        {
          ...validRule,
          no_data: {
            strategy: 'keep_last',
            query: 'FROM heartbeat-* | STATS COUNT(*) BY host.name',
          },
        },
        ops
      );

      expect(result.data.no_data).toEqual({
        strategy: 'keep_last',
        query: 'FROM heartbeat-* | STATS COUNT(*) BY host.name',
      });
    });

    it('passes validation for a rule that alerts on no data', async () => {
      const ops: RuleOperation[] = [{ operation: 'validate' }];

      const result = await executeRuleOperations(
        { ...validRule, no_data: { strategy: 'alert' } },
        ops
      );

      expect(result.data.no_data).toEqual({ strategy: 'alert' });
    });
  });

  describe('basic operations without ES client', () => {
    it('applies set_metadata', async () => {
      const ops: RuleOperation[] = [
        { operation: 'set_metadata', name: 'Test Rule', description: 'A test', tags: ['test'] },
      ];

      const result = await executeRuleOperations({}, ops);

      expect(result.data.metadata).toEqual({
        name: 'Test Rule',
        description: 'A test',
        tags: ['test', AGENT_BUILDER_TAG],
      });
    });

    it('merges metadata with existing data', async () => {
      const existing: Partial<RuleAttachmentData> = {
        metadata: { name: 'Old Name', description: 'Old desc' },
      };
      const ops: RuleOperation[] = [{ operation: 'set_metadata', name: 'New Name' }];

      const result = await executeRuleOperations(existing, ops);

      expect(result.data.metadata?.name).toBe('New Name');
      expect(result.data.metadata?.description).toBe('Old desc');
    });

    it('applies set_kind', async () => {
      const ops: RuleOperation[] = [{ operation: 'set_kind', kind: 'alert' }];

      const result = await executeRuleOperations({}, ops);

      expect(result.data.kind).toBe('alert');
    });

    it('applies set_schedule', async () => {
      const ops: RuleOperation[] = [{ operation: 'set_schedule', every: '1m', lookback: '5m' }];

      const result = await executeRuleOperations({}, ops);

      expect(result.data.schedule).toEqual({ every: '1m', lookback: '5m' });
    });
  });

  describe('set_dashboards', () => {
    it('stores dashboard IDs as dashboard artifacts matching the create/update API', async () => {
      const ops: RuleOperation[] = [
        { operation: 'set_dashboards', dashboard_ids: ['dash-1', 'dash-2'] },
      ];

      const result = await executeRuleOperations({}, ops);

      expect(result.data.artifacts).toEqual([
        {
          id: expect.stringMatching(/^dashboard-/),
          type: 'dashboard',
          data: { dashboard_id: 'dash-1' },
        },
        {
          id: expect.stringMatching(/^dashboard-/),
          type: 'dashboard',
          data: { dashboard_id: 'dash-2' },
        },
      ]);
      expect(result.data.artifacts?.[0].id).not.toBe(result.data.artifacts?.[1].id);
    });

    it('replaces previously linked dashboards and preserves other artifacts', async () => {
      const existing: Partial<RuleAttachmentData> = {
        artifacts: [
          { id: 'runbook-1', type: 'runbook', data: { content: 'Restart the service' } },
          { id: 'dashboard-old', type: 'dashboard', data: { dashboard_id: 'old-dash' } },
        ],
      };
      const ops: RuleOperation[] = [{ operation: 'set_dashboards', dashboard_ids: ['new-dash'] }];

      const result = await executeRuleOperations(existing, ops);

      expect(result.data.artifacts).toEqual([
        { id: 'runbook-1', type: 'runbook', data: { content: 'Restart the service' } },
        {
          id: expect.stringMatching(/^dashboard-/),
          type: 'dashboard',
          data: { dashboard_id: 'new-dash' },
        },
      ]);
    });

    it('reuses the existing artifact id when the same dashboard is already attached', async () => {
      const existing: Partial<RuleAttachmentData> = {
        artifacts: [{ id: 'dashboard-keep', type: 'dashboard', data: { dashboard_id: 'dash-1' } }],
      };
      const ops: RuleOperation[] = [
        { operation: 'set_dashboards', dashboard_ids: ['dash-1', 'dash-2'] },
      ];

      const result = await executeRuleOperations(existing, ops);

      expect(result.data.artifacts).toEqual([
        { id: 'dashboard-keep', type: 'dashboard', data: { dashboard_id: 'dash-1' } },
        {
          id: expect.stringMatching(/^dashboard-/),
          type: 'dashboard',
          data: { dashboard_id: 'dash-2' },
        },
      ]);
    });

    it('deduplicates dashboard IDs', async () => {
      const ops: RuleOperation[] = [
        { operation: 'set_dashboards', dashboard_ids: ['dash-1', 'dash-1'] },
      ];

      const result = await executeRuleOperations({}, ops);

      expect(result.data.artifacts).toHaveLength(1);
      expect(result.data.artifacts?.[0].data).toEqual({ dashboard_id: 'dash-1' });
    });

    it('unlinks all dashboards when passed an empty array', async () => {
      const existing: Partial<RuleAttachmentData> = {
        artifacts: [
          { id: 'runbook-1', type: 'runbook', data: { content: 'Restart the service' } },
          { id: 'dashboard-old', type: 'dashboard', data: { dashboard_id: 'old-dash' } },
        ],
      };
      const ops: RuleOperation[] = [{ operation: 'set_dashboards', dashboard_ids: [] }];

      const result = await executeRuleOperations(existing, ops);

      expect(result.data.artifacts).toEqual([
        { id: 'runbook-1', type: 'runbook', data: { content: 'Restart the service' } },
      ]);
    });

    it('throws when merged artifacts would exceed the API cap', async () => {
      const existing: Partial<RuleAttachmentData> = {
        artifacts: Array.from({ length: 99 }, (_, index) => ({
          id: `runbook-${index}`,
          type: 'runbook',
          data: { content: `step ${index}` },
        })),
      };
      const ops: RuleOperation[] = [
        { operation: 'set_dashboards', dashboard_ids: ['dash-1', 'dash-2'] },
      ];

      await expect(executeRuleOperations(existing, ops)).rejects.toThrow(
        RuleOperationValidationError
      );
      await expect(executeRuleOperations(existing, ops)).rejects.toThrow(/at most 100 artifacts/);
    });

    it('rejects dashboard IDs that are not dashboard saved objects', async () => {
      const soClient = createMockSoClient(['dash-1']);
      const ops: RuleOperation[] = [
        { operation: 'set_dashboards', dashboard_ids: ['dash-1', 'missing-dash'] },
      ];

      await expect(executeRuleOperations({}, ops, undefined, soClient)).rejects.toThrow(
        RuleOperationValidationError
      );
      await expect(executeRuleOperations({}, ops, undefined, soClient)).rejects.toThrow(
        /Dashboard saved object\(s\) not found: missing-dash/
      );
      expect(soClient.bulkGet).toHaveBeenCalledWith([
        { type: 'dashboard', id: 'dash-1' },
        { type: 'dashboard', id: 'missing-dash' },
      ]);
    });

    it('accepts dashboard IDs that resolve to dashboard saved objects', async () => {
      const soClient = createMockSoClient(['dash-1', 'dash-2']);
      const ops: RuleOperation[] = [
        { operation: 'set_dashboards', dashboard_ids: ['dash-1', 'dash-2'] },
      ];

      const result = await executeRuleOperations({}, ops, undefined, soClient);

      expect(result.data.artifacts).toHaveLength(2);
      expect(soClient.bulkGet).toHaveBeenCalledWith([
        { type: 'dashboard', id: 'dash-1' },
        { type: 'dashboard', id: 'dash-2' },
      ]);
    });

    it('does not look up saved objects when unlinking all dashboards', async () => {
      const soClient = createMockSoClient([]);
      const ops: RuleOperation[] = [{ operation: 'set_dashboards', dashboard_ids: [] }];

      const result = await executeRuleOperations({}, ops, undefined, soClient);

      expect(soClient.bulkGet).not.toHaveBeenCalled();
      expect(result.data.artifacts).toEqual([]);
    });
  });

  describe('set_runbook', () => {
    it('stores markdown as a runbook artifact matching the create/update API', async () => {
      const ops: RuleOperation[] = [
        { operation: 'set_runbook', content: '# Restart the service\n\n1. Check logs' },
      ];

      const result = await executeRuleOperations({}, ops);

      expect(result.data.artifacts).toEqual([
        {
          id: expect.stringMatching(/^runbook-/),
          type: 'runbook',
          data: { content: '# Restart the service\n\n1. Check logs' },
        },
      ]);
    });

    it('replaces an existing runbook and reuses its artifact id', async () => {
      const existing: Partial<RuleAttachmentData> = {
        artifacts: [{ id: 'runbook-keep', type: 'runbook', data: { content: 'Old steps' } }],
      };
      const ops: RuleOperation[] = [{ operation: 'set_runbook', content: 'New steps' }];

      const result = await executeRuleOperations(existing, ops);

      expect(result.data.artifacts).toEqual([
        { id: 'runbook-keep', type: 'runbook', data: { content: 'New steps' } },
      ]);
    });

    it('replaces previously attached runbooks and preserves dashboard artifacts', async () => {
      const existing: Partial<RuleAttachmentData> = {
        artifacts: [
          { id: 'runbook-old', type: 'runbook', data: { content: 'Old steps' } },
          { id: 'dashboard-1', type: 'dashboard', data: { dashboard_id: 'dash-1' } },
        ],
      };
      const ops: RuleOperation[] = [{ operation: 'set_runbook', content: 'New steps' }];

      const result = await executeRuleOperations(existing, ops);

      expect(result.data.artifacts).toEqual([
        { id: 'dashboard-1', type: 'dashboard', data: { dashboard_id: 'dash-1' } },
        { id: 'runbook-old', type: 'runbook', data: { content: 'New steps' } },
      ]);
    });

    it('replaces multiple existing runbooks with a single artifact', async () => {
      const existing: Partial<RuleAttachmentData> = {
        artifacts: [
          { id: 'runbook-1', type: 'runbook', data: { content: 'First' } },
          { id: 'runbook-2', type: 'runbook', data: { content: 'Second' } },
          { id: 'dashboard-1', type: 'dashboard', data: { dashboard_id: 'dash-1' } },
        ],
      };
      const ops: RuleOperation[] = [{ operation: 'set_runbook', content: 'Only runbook' }];

      const result = await executeRuleOperations(existing, ops);

      expect(result.data.artifacts).toEqual([
        { id: 'dashboard-1', type: 'dashboard', data: { dashboard_id: 'dash-1' } },
        { id: 'runbook-1', type: 'runbook', data: { content: 'Only runbook' } },
      ]);
    });

    it.each([null, '', '   '])('unlinks the runbook when content is %j', async (content) => {
      const existing: Partial<RuleAttachmentData> = {
        artifacts: [
          { id: 'runbook-1', type: 'runbook', data: { content: 'Restart the service' } },
          { id: 'dashboard-1', type: 'dashboard', data: { dashboard_id: 'dash-1' } },
        ],
      };
      const ops: RuleOperation[] = [{ operation: 'set_runbook', content }];

      const result = await executeRuleOperations(existing, ops);

      expect(result.data.artifacts).toEqual([
        { id: 'dashboard-1', type: 'dashboard', data: { dashboard_id: 'dash-1' } },
      ]);
    });

    it('throws when merged artifacts would exceed the API cap', async () => {
      const existing: Partial<RuleAttachmentData> = {
        artifacts: Array.from({ length: 100 }, (_, index) => ({
          id: `dashboard-${index}`,
          type: 'dashboard',
          data: { dashboard_id: `dash-${index}` },
        })),
      };
      const ops: RuleOperation[] = [{ operation: 'set_runbook', content: 'Steps' }];

      await expect(executeRuleOperations(existing, ops)).rejects.toThrow(
        RuleOperationValidationError
      );
      await expect(executeRuleOperations(existing, ops)).rejects.toThrow(/at most 100 artifacts/);
    });

    it('rejects content over the runbook limit at the operation schema', () => {
      const result = ruleOperationSchema.safeParse({
        operation: 'set_runbook',
        content: 'a'.repeat(RUNBOOK_CONTENT_LIMIT + 1),
      });

      expect(result.success).toBe(false);
    });

    it('accepts content at the runbook limit', () => {
      const result = ruleOperationSchema.safeParse({
        operation: 'set_runbook',
        content: 'a'.repeat(RUNBOOK_CONTENT_LIMIT),
      });

      expect(result.success).toBe(true);
    });
  });
});
