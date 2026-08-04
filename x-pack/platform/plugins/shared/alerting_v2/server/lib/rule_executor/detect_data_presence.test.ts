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
import type { RuleResponse } from '../rules_client';
import { detectDataPresence } from './detect_data_presence';

const HOST = 'abc';
const groupingFields = ['host.name'];
const hostHash = buildGroupHash({
  rowDoc: { 'host.name': HOST },
  groupKeyFields: groupingFields,
  fallbackSeed: 'unused',
});

describe('detectDataPresence', () => {
  const { loggerService } = createLoggerService();

  function setup() {
    const scoped = createQueryService();
    return { queryService: scoped.queryService, scopedEsClient: scoped.mockEsClient };
  }

  function buildRule(overrides: Partial<RuleResponse> = {}): RuleResponse {
    return createRuleResponse({
      kind: 'alert',
      grouping: { fields: groupingFields },
      no_data_strategy: 'emit',
      query: {
        format: 'standalone',
        breach: { query: 'FROM metrics-* | WHERE avg_cpu > 90' },
        no_data: { query: 'FROM metrics-* | STATS COUNT(*) BY host.name' },
      },
      ...overrides,
    });
  }

  it("returns an empty set when no_data_strategy is 'none'", async () => {
    const { queryService, scopedEsClient } = setup();

    const result = await detectDataPresence({
      queryService,
      rule: buildRule({ no_data_strategy: 'none' }),
      input: createRuleExecutionInput(),
      logger: loggerService,
    });

    expect(scopedEsClient.esql.query).not.toHaveBeenCalled();
    expect(result).toEqual(new Set());
  });

  it('returns an empty set when a standalone rule omits the query.no_data block', async () => {
    const { queryService, scopedEsClient } = setup();

    const result = await detectDataPresence({
      queryService,
      rule: createRuleResponse({
        kind: 'alert',
        no_data_strategy: 'emit',
        grouping: { fields: groupingFields },
        query: { format: 'standalone', breach: { query: 'FROM metrics-*' } },
      }),
      input: createRuleExecutionInput(),
      logger: loggerService,
    });

    expect(scopedEsClient.esql.query).not.toHaveBeenCalled();
    expect(result).toEqual(new Set());
  });

  it('records the group hashes reported by the no-data query', async () => {
    const { queryService, scopedEsClient } = setup();

    scopedEsClient.esql.query.mockResolvedValue(
      createEsqlResponse([{ name: 'host.name', type: 'keyword' }], [[HOST]])
    );

    const result = await detectDataPresence({
      queryService,
      rule: buildRule(),
      input: createRuleExecutionInput(),
      logger: loggerService,
    });

    expect(scopedEsClient.esql.query).toHaveBeenCalledTimes(1);
    expect(result).toEqual(new Set([hostHash]));
  });

  it('records an empty set when the no-data query returns no rows', async () => {
    const { queryService, scopedEsClient } = setup();

    scopedEsClient.esql.query.mockResolvedValue(createEsqlResponse([], []));

    const result = await detectDataPresence({
      queryService,
      rule: buildRule(),
      input: createRuleExecutionInput(),
      logger: loggerService,
    });

    expect(result).toEqual(new Set());
  });

  it('uses the composed base query as the no-data query', async () => {
    const { queryService, scopedEsClient } = setup();

    const baseQuery = 'FROM metrics-* | STATS AVG(cpu) BY host.name';
    scopedEsClient.esql.query.mockResolvedValue(
      createEsqlResponse([{ name: 'host.name', type: 'keyword' }], [[HOST]])
    );

    const result = await detectDataPresence({
      queryService,
      rule: createRuleResponse({
        kind: 'alert',
        no_data_strategy: 'emit',
        grouping: { fields: groupingFields },
        query: {
          format: 'composed',
          base: baseQuery,
          breach: { segment: 'WHERE AVG(cpu) > 0.9' },
        },
      }),
      input: createRuleExecutionInput(),
      logger: loggerService,
    });

    expect(scopedEsClient.esql.query).toHaveBeenCalledWith(
      expect.objectContaining({ query: baseQuery }),
      expect.any(Object)
    );
    expect(result).toEqual(new Set([hostHash]));
  });

  it('surfaces ES|QL 4xx errors as TaskErrorSource.USER', async () => {
    const { queryService, scopedEsClient } = setup();

    scopedEsClient.esql.query.mockRejectedValue(
      // @ts-expect-error: Not all params are needed for the test.
      new errors.ResponseError({ statusCode: 400 })
    );

    const error = await detectDataPresence({
      queryService,
      rule: buildRule(),
      input: createRuleExecutionInput(),
      logger: loggerService,
    }).catch((e: Error) => e);

    expect(error).toBeInstanceOf(Error);
    expect(getErrorSource(error as Error)).toBe(TaskErrorSource.USER);
  });

  it('does not classify ES|QL 5xx errors as user errors (server-side, retryable)', async () => {
    const { queryService, scopedEsClient } = setup();

    scopedEsClient.esql.query.mockRejectedValue(
      new errors.ResponseError({ statusCode: 503 } as DiagnosticResult)
    );

    const error = await detectDataPresence({
      queryService,
      rule: buildRule(),
      input: createRuleExecutionInput(),
      logger: loggerService,
    }).catch((e: Error) => e);

    expect(error).toBeInstanceOf(Error);
    expect(getErrorSource(error as Error)).toBeUndefined();
  });

  it('forwards the executionContext abort signal to the data-presence ES|QL call', async () => {
    const { queryService, scopedEsClient } = setup();

    scopedEsClient.esql.query.mockResolvedValue(createEsqlResponse([], []));

    const abortController = new AbortController();
    const input = createRuleExecutionInput({ abortSignal: abortController.signal });

    await detectDataPresence({ queryService, rule: buildRule(), input, logger: loggerService });

    expect(scopedEsClient.esql.query).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ signal: abortController.signal })
    );
  });
});
