/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core/server';
import {
  buildCountBasedRuleOnRuleEsql,
  buildMetricBasedRuleOnRuleEsql,
} from './reference_templates';
import {
  RuleOnRuleValidationError,
  validateRuleOnRulePlan,
} from './validate_rule_on_rule_esql';
import type { RuleOnRulePlan } from './types';

function createEmptyArrowReader() {
  return {
    closed: false,
    cancel: jest.fn().mockResolvedValue(undefined),
    async *[Symbol.asyncIterator]() {},
  };
}

function makeEsClient(
  toArrowReader: jest.Mock = jest.fn().mockResolvedValue(createEmptyArrowReader())
) {
  return {
    asCurrentUser: {
      helpers: {
        esql: jest.fn().mockReturnValue({ toArrowReader }),
      },
    },
  } as unknown as IScopedClusterClient;
}

const validPlan = (esql: string): RuleOnRulePlan => ({
  path: 'count-based',
  rules: [{ esql }],
  reasoning: 'count-based change detection',
});

describe('validateRuleOnRulePlan', () => {
  const monitoredRuleId = 'base-rule-id';

  it('accepts a valid count-based plan', async () => {
    const esql = buildCountBasedRuleOnRuleEsql(monitoredRuleId);
    await expect(validateRuleOnRulePlan(validPlan(esql), makeEsClient())).resolves.toBeUndefined();
  });

  it('accepts a valid metric-based plan with FIELD_EXTRACT', async () => {
    const esql = buildMetricBasedRuleOnRuleEsql(monitoredRuleId, 'failure_rate', 'bucket');
    await expect(
      validateRuleOnRulePlan({ path: 'metric-based', rules: [{ esql }], reasoning: 'metrics' }, makeEsClient())
    ).resolves.toBeUndefined();
  });

  it('rejects ES|QL using data.* dot notation on flattened data', async () => {
    const esql = `FROM .rule-events | WHERE rule.id == "${monitoredRuleId}" | CHANGE_POINT data.failure_rate ON data.bucket | WHERE type IS NOT NULL`;
    await expect(validateRuleOnRulePlan(validPlan(esql), makeEsClient())).rejects.toThrow(
      'FIELD_EXTRACT'
    );
  });

  it('rejects unsupported path', async () => {
    await expect(
      validateRuleOnRulePlan(
        { path: 'unsupported', rules: [{ esql: 'FROM .rule-events' }], reasoning: 'n/a' },
        makeEsClient()
      )
    ).rejects.toThrow(RuleOnRuleValidationError);
  });

  it('rejects ES|QL missing CHANGE_POINT', async () => {
    const esql = `FROM .rule-events | WHERE rule.id == "${monitoredRuleId}" | WHERE type IS NOT NULL`;
    await expect(validateRuleOnRulePlan(validPlan(esql), makeEsClient())).rejects.toThrow(
      'CHANGE_POINT'
    );
  });

  it('rejects ES|QL missing type filter', async () => {
    const esql = `FROM .rule-events | CHANGE_POINT count ON bucket`;
    await expect(validateRuleOnRulePlan(validPlan(esql), makeEsClient())).rejects.toThrow(
      'WHERE type IS NOT NULL'
    );
  });

  it('rejects ES|QL that does not query .rule-events', async () => {
    const esql = `FROM logs-* | CHANGE_POINT count ON bucket | WHERE type IS NOT NULL`;
    await expect(validateRuleOnRulePlan(validPlan(esql), makeEsClient())).rejects.toThrow(
      '.rule-events'
    );
  });

  it('rejects count-based ES|QL with a non-30-second bucket interval', async () => {
    const esql = `FROM .rule-events
| WHERE rule.id == "${monitoredRuleId}" AND type == "signal" AND status == "breached"
| STATS count = COUNT_DISTINCT(group_hash) BY bucket = BUCKET(@timestamp, 5 minutes)
| CHANGE_POINT count ON bucket
| WHERE type IS NOT NULL`;
    await expect(validateRuleOnRulePlan(validPlan(esql), makeEsClient())).rejects.toThrow(
      'BUCKET(@timestamp, 30 seconds)'
    );
  });

  it('rejects ES|QL that filters on space_id', async () => {
    const esql = `FROM .rule-events
| WHERE rule.id == "${monitoredRuleId}" AND space_id == "default" AND type == "signal" AND status == "breached"
| STATS count = COUNT_DISTINCT(group_hash) BY bucket = BUCKET(@timestamp, 30 seconds)
| CHANGE_POINT count ON bucket
| WHERE type IS NOT NULL`;
    await expect(validateRuleOnRulePlan(validPlan(esql), makeEsClient())).rejects.toThrow(
      'space_id'
    );
  });

  it('allows metric-based ES|QL without BUCKET(@timestamp, 30 seconds)', async () => {
    const esql = buildMetricBasedRuleOnRuleEsql(monitoredRuleId, 'failure_rate', 'bucket');
    await expect(
      validateRuleOnRulePlan({ path: 'metric-based', rules: [{ esql }], reasoning: 'metrics' }, makeEsClient())
    ).resolves.toBeUndefined();
  });

  it('rejects invalid ES|QL syntax from Elasticsearch', async () => {
    const esql = buildCountBasedRuleOnRuleEsql(monitoredRuleId);
    const toArrowReader = jest.fn().mockRejectedValue(new Error('syntax error'));
    await expect(
      validateRuleOnRulePlan(validPlan(esql), makeEsClient(toArrowReader))
    ).rejects.toThrow('Invalid rule-on-rule ES|QL');
  });
});
