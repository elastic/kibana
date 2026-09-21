/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiagnosticResult } from '@elastic/elasticsearch';
import { errors } from '@elastic/elasticsearch';
import { TaskErrorSource } from '@kbn/task-manager-plugin/server';
import { getErrorSource } from '@kbn/task-manager-plugin/server/task_running';
import { createRuleExecutionInput, createRuleResponse, createEsqlResponse } from './test_utils';
import { createLoggerService } from '../services/logger_service/logger_service.mock';
import { createQueryService } from '../services/query_service/query_service.mock';
import { buildGroupHash } from './build_alert_events';
import type { AlertEvent } from '../../resources/datastreams/alert_events';
import type { ActiveAlertGroupHash } from './queries';
import { executeRecoveryQuery } from './execute_recovery_query';

describe('executeRecoveryQuery', () => {
  const { loggerService } = createLoggerService();

  function setup() {
    const scoped = createQueryService();
    return { queryService: scoped.queryService, scopedEsClient: scoped.mockEsClient };
  }

  const toActive = (hashes: string[]): ActiveAlertGroupHash[] =>
    hashes.map((group_hash) => ({ group_hash }));

  it('runs the recovery query and creates events for matching active groups', async () => {
    const { queryService, scopedEsClient } = setup();

    scopedEsClient.esql.query.mockResolvedValue(
      createEsqlResponse([{ name: 'host.name', type: 'keyword' }], [['recovery-host-1']])
    );

    const rule = createRuleResponse({
      kind: 'alert',
      recovery_strategy: 'query',
      grouping: { fields: ['host.name'] },
      query: {
        format: 'standalone',
        breach: { query: 'FROM logs-* | LIMIT 10' },
        recovery: { query: 'FROM logs-* | WHERE recovered = true' },
      },
    });

    const recoveredHash = buildGroupHash({
      rowDoc: { 'host.name': 'recovery-host-1' },
      groupKeyFields: ['host.name'],
      fallbackSeed: 'unused',
    });

    const events = await executeRecoveryQuery({
      queryService,
      logger: loggerService,
      rule,
      effectiveQuery: 'FROM logs-* | WHERE recovered = true',
      input: createRuleExecutionInput(),
      activeGroupHashes: toActive([recoveredHash]),
      breachedGroupHashes: new Set(),
    });

    expect(scopedEsClient.esql.query).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'FROM logs-* | WHERE recovered = true' }),
      expect.any(Object)
    );
    expect(events).toHaveLength(1);
    expect(events[0].status).toBe('recovered');
    expect(events[0].group_hash).toBe(recoveredHash);
  });

  it('returns no events when the recovery query returns empty results', async () => {
    const { queryService, scopedEsClient } = setup();

    scopedEsClient.esql.query.mockResolvedValue(createEsqlResponse([], []));

    const events = await executeRecoveryQuery({
      queryService,
      logger: loggerService,
      rule: createRuleResponse({ kind: 'alert', recovery_strategy: 'query' }),
      effectiveQuery: 'FROM logs-* | WHERE recovered = true',
      input: createRuleExecutionInput(),
      activeGroupHashes: toActive(['hash-1', 'hash-2']),
      breachedGroupHashes: new Set(),
    });

    expect(events).toEqual([]);
  });

  it('excludes breached groups from recovery even when the recovery query matches them (breach wins)', async () => {
    const { queryService, scopedEsClient } = setup();

    const groupingFields = ['host.name'];
    const hashX = buildGroupHash({
      rowDoc: { 'host.name': 'host-x' },
      groupKeyFields: groupingFields,
      fallbackSeed: 'unused',
    });
    const hashY = buildGroupHash({
      rowDoc: { 'host.name': 'host-y' },
      groupKeyFields: groupingFields,
      fallbackSeed: 'unused',
    });

    scopedEsClient.esql.query.mockResolvedValue(
      createEsqlResponse([{ name: 'host.name', type: 'keyword' }], [['host-x'], ['host-y']])
    );

    const events = await executeRecoveryQuery({
      queryService,
      logger: loggerService,
      rule: createRuleResponse({
        kind: 'alert',
        recovery_strategy: 'query',
        grouping: { fields: groupingFields },
      }),
      effectiveQuery: 'FROM logs-* | STATS count(*) BY host.name',
      input: createRuleExecutionInput(),
      activeGroupHashes: toActive([hashX, hashY]),
      breachedGroupHashes: new Set([hashX]),
    });

    const byGroup = Object.fromEntries(events.map((e: AlertEvent) => [e.group_hash, e.status]));
    expect(byGroup[hashX]).toBeUndefined();
    expect(byGroup[hashY]).toBe('recovered');
    expect(events.filter((e) => e.status === 'recovered')).toHaveLength(1);
  });

  it('marks ResponseError(400) recovery query errors as TaskErrorSource.USER', async () => {
    const { queryService, scopedEsClient } = setup();

    scopedEsClient.esql.query.mockRejectedValue(
      // @ts-expect-error: Not all params are needed for the test.
      new errors.ResponseError({ statusCode: 400 })
    );

    const error = await executeRecoveryQuery({
      queryService,
      logger: loggerService,
      rule: createRuleResponse({ kind: 'alert', recovery_strategy: 'query' }),
      effectiveQuery: 'FROM logs-* | WHERE invalid syntax',
      input: createRuleExecutionInput(),
      activeGroupHashes: toActive(['hash-1']),
      breachedGroupHashes: new Set(),
    }).catch((e: Error) => e);

    expect(error).toBeInstanceOf(Error);
    expect(getErrorSource(error as Error)).toBe(TaskErrorSource.USER);
  });

  it('does not mark ResponseError(503) recovery query errors as TaskErrorSource.USER', async () => {
    const { queryService, scopedEsClient } = setup();

    scopedEsClient.esql.query.mockRejectedValue(
      new errors.ResponseError({ statusCode: 503 } as DiagnosticResult)
    );

    const error = await executeRecoveryQuery({
      queryService,
      logger: loggerService,
      rule: createRuleResponse({ kind: 'alert', recovery_strategy: 'query' }),
      effectiveQuery: 'FROM logs-*',
      input: createRuleExecutionInput(),
      activeGroupHashes: toActive(['hash-1']),
      breachedGroupHashes: new Set(),
    }).catch((e: Error) => e);

    expect(error).toBeInstanceOf(Error);
    expect(getErrorSource(error as Error)).toBeUndefined();
  });

  it('does not mark plain recovery query errors as TaskErrorSource.USER', async () => {
    const { queryService, scopedEsClient } = setup();

    scopedEsClient.esql.query.mockRejectedValue(new Error('connection reset'));

    const error = await executeRecoveryQuery({
      queryService,
      logger: loggerService,
      rule: createRuleResponse({ kind: 'alert', recovery_strategy: 'query' }),
      effectiveQuery: 'FROM logs-*',
      input: createRuleExecutionInput(),
      activeGroupHashes: toActive(['hash-1']),
      breachedGroupHashes: new Set(),
    }).catch((e: Error) => e);

    expect(error).toBeInstanceOf(Error);
    expect(getErrorSource(error as Error)).toBeUndefined();
  });

  it('forwards the executionContext abort signal to the recovery ES|QL call', async () => {
    const { queryService, scopedEsClient } = setup();

    scopedEsClient.esql.query.mockResolvedValue(createEsqlResponse([], []));

    const abortController = new AbortController();
    const input = createRuleExecutionInput({ abortSignal: abortController.signal });

    await executeRecoveryQuery({
      queryService,
      logger: loggerService,
      rule: createRuleResponse({ kind: 'alert', recovery_strategy: 'query' }),
      effectiveQuery: 'FROM logs-*',
      input,
      activeGroupHashes: toActive(['hash-1']),
      breachedGroupHashes: new Set(),
    });

    expect(scopedEsClient.esql.query).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ signal: abortController.signal })
    );
  });
});
