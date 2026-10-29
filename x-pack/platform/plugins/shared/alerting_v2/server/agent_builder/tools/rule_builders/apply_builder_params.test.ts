/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { RULE_BUILDER_TYPES, THRESHOLD_BUILDER_TYPE } from '@kbn/alerting-v2-rule-builders';
import { RuleOperationValidationError } from '../rule_operations/operations';
import { applyBuilderParams, type ApplyBuilderParamsOptions } from './apply_builder_params';
import { mockDateFields, mockEsqlColumns } from './es_client.mock';

const builder = RULE_BUILDER_TYPES[THRESHOLD_BUILDER_TYPE];

const params = {
  indexPattern: 'metrics-*',
  timeField: '@timestamp',
  stats: [{ label: 'avg_cpu', aggregation: 'avg', field: 'system.cpu.total.norm.pct' }],
  alertConditions: [{ metric: 'avg_cpu', comparator: '>', threshold: [0.9] }],
  groupByFields: ['host.name'],
};

const apply = (overrides: Partial<ApplyBuilderParamsOptions> = {}) =>
  applyBuilderParams({
    builder,
    current: {},
    params,
    settings: [{ operation: 'set_metadata', name: 'High CPU' }],
    isNew: true,
    savedObjectsClient: savedObjectsClientMock.create(),
    ...overrides,
  });

describe('applyBuilderParams', () => {
  it('generates the query, time field and grouping, and marks the rule with its builder', async () => {
    const { data } = await apply();

    expect(data.query?.base).toContain('FROM metrics-*');
    expect(data.query?.breach?.segment).toContain('WHERE avg_cpu > 0.9');
    expect(data.time_field).toBe('@timestamp');
    expect(data.grouping).toEqual({ fields: ['host.name'] });
    expect(data.metadata).toEqual({ name: 'High CPU', builder: { type: 'threshold' } });
  });

  it('returns the parsed params with defaults applied', async () => {
    const { params: parsed } = await apply();

    expect(parsed).toEqual({ ...params, evaluations: [], conditionOperator: 'AND' });
  });

  it('defaults the kind and schedule for a new rule', async () => {
    const { data } = await apply();

    expect(data.kind).toBe('alert');
    expect(data.schedule).toEqual({ every: '5m' });
  });

  it('keeps the kind and schedule the rule already has', async () => {
    const { data } = await apply({
      current: { kind: 'signal', schedule: { every: '1m' }, metadata: { name: 'CPU' } },
      settings: [],
      isNew: false,
    });

    expect(data.kind).toBe('signal');
    expect(data.schedule).toEqual({ every: '1m' });
    expect(data.query?.breach).toBeUndefined();
  });

  it('builds for the kind the settings choose', async () => {
    const { data } = await apply({
      params: {
        ...params,
        recovery: { conditions: [{ metric: 'avg_cpu', comparator: '<', threshold: [0.8] }] },
      },
      settings: [
        { operation: 'set_metadata', name: 'CPU' },
        { operation: 'set_kind', kind: 'signal' },
      ],
    });

    expect(data.kind).toBe('signal');
    expect(data.query?.breach).toBeUndefined();
    expect(data.recovery).toBeUndefined();
  });

  it('removes the grouping and recovery the params no longer produce', async () => {
    const { data } = await apply({
      current: {
        kind: 'alert',
        metadata: { name: 'CPU', builder: { type: 'threshold' } },
        grouping: { fields: ['host.name'] },
        recovery: { strategy: 'condition', segment: 'WHERE avg_cpu < 0.8' },
      },
      params: { ...params, groupByFields: [] },
      settings: [],
      isNew: false,
    });

    expect(data).not.toHaveProperty('grouping');
    expect(data).not.toHaveProperty('recovery');
  });

  it('keeps the settings the rule already has', async () => {
    const { data } = await apply({
      current: {
        kind: 'alert',
        metadata: { name: 'CPU', tags: ['infra'] },
        no_data: { strategy: 'ignore' },
      },
      settings: [],
      isNew: false,
    });

    expect(data.metadata).toEqual({ name: 'CPU', tags: ['infra'], builder: { type: 'threshold' } });
    expect(data.no_data).toEqual({ strategy: 'ignore' });
  });

  it('rejects invalid params with every issue listed', async () => {
    await expect(
      apply({
        params: {
          ...params,
          alertConditions: [{ metric: 'missing', comparator: '>', threshold: [1] }],
        },
      })
    ).rejects.toThrow(
      new RuleOperationValidationError(
        'Invalid Threshold params:\n- Alert condition metric "missing" is not a stat or evaluation label. Available labels: avg_cpu.'
      )
    );
  });

  it('requires a name for a new rule', async () => {
    await expect(apply({ settings: [] })).rejects.toThrow(/A rule name is required/);
  });

  describe('with Elasticsearch', () => {
    let esClient: ReturnType<typeof elasticsearchServiceMock.createScopedClusterClient>;

    beforeEach(() => {
      esClient = elasticsearchServiceMock.createScopedClusterClient();
      mockEsqlColumns(esClient, [{ name: 'avg_cpu', type: 'double' }]);
      mockDateFields(esClient, ['@timestamp']);
    });

    it('validates the full breach query and returns its columns', async () => {
      const { queryColumns } = await apply({ esClient });

      expect(esClient.asCurrentUser.esql.query).toHaveBeenCalledWith({
        query: expect.stringMatching(/WHERE avg_cpu > 0\.9 \| LIMIT 0$/),
        format: 'json',
      });
      expect(queryColumns).toEqual([{ name: 'avg_cpu', type: 'double' }]);
    });

    it('reports Elasticsearch errors for the generated query', async () => {
      jest
        .mocked(esClient.asCurrentUser.esql.query)
        .mockRejectedValue(new Error('Unknown index [metrics-*]'));

      await expect(apply({ esClient })).rejects.toThrow(
        'Invalid ES|QL query: Unknown index [metrics-*]'
      );
    });

    it('rejects a time field that is not a date field on the index', async () => {
      mockDateFields(esClient, ['timestamp', 'event.ingested']);

      await expect(apply({ esClient })).rejects.toThrow(
        'The time field "@timestamp" is not a `date` or `date_nanos` field on the index. Available date fields: "event.ingested", "timestamp".'
      );
    });

    it('rejects an index without date fields', async () => {
      mockDateFields(esClient, []);

      await expect(apply({ esClient })).rejects.toThrow(/has no `date` or `date_nanos` field/);
    });
  });
});
