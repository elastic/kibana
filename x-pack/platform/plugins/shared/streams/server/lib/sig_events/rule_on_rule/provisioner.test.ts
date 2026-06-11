/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { RulesClientApi } from '@kbn/alerting-v2-plugin/server';
import type { IScopedClusterClient } from '@kbn/core/server';
import { buildCountBasedRuleOnRuleEsql } from './reference_templates';
import { provisionRuleOnRules } from './provisioner';
import { computeRuleOnRuleId } from './compute_rule_on_rule_id';
import type { BaseRuleSnapshot, RuleOnRulePlan } from './types';

function makeRulesClient() {
  return {
    upsertRule: jest.fn().mockResolvedValue(undefined),
    updateRule: jest.fn().mockResolvedValue(undefined),
  } as unknown as RulesClientApi;
}

function createEmptyArrowReader() {
  return {
    closed: false,
    cancel: jest.fn().mockResolvedValue(undefined),
    async *[Symbol.asyncIterator]() {},
  };
}

function makeEsClient() {
  return {
    asCurrentUser: {
      helpers: {
        esql: jest.fn().mockReturnValue({
          toArrowReader: jest.fn().mockResolvedValue(createEmptyArrowReader()),
        }),
      },
    },
  } as unknown as IScopedClusterClient;
}

const baseRule: BaseRuleSnapshot = {
  ruleId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  spaceId: 'default',
  name: 'High error rate',
  kind: 'signal',
  query: 'FROM logs-* | WHERE level == "error"',
  tags: ['sigevents:stream:logs.app'],
};

describe('provisionRuleOnRules', () => {
  it('skips non-signal base rules', async () => {
    const rulesClient = makeRulesClient();
    const result = await provisionRuleOnRules({
      baseRule: { ...baseRule, kind: 'alert' },
      plan: { path: 'count-based', rules: [{ esql: 'FROM .rule-events' }], reasoning: 'x' },
      rulesClient,
      esClient: makeEsClient(),
    });

    expect(result.skipped).toBe(true);
    expect(rulesClient.upsertRule).not.toHaveBeenCalled();
  });

  it('provisions count-based rule-on-rule children', async () => {
    const rulesClient = makeRulesClient();
    const esql = buildCountBasedRuleOnRuleEsql(baseRule.ruleId);
    const plan: RuleOnRulePlan = {
      path: 'count-based',
      rules: [{ esql }],
      reasoning: 'count spike detection',
    };

    const result = await provisionRuleOnRules({
      baseRule,
      plan,
      rulesClient,
      esClient: makeEsClient(),
    });

    expect(result).toEqual({
      provisionedRuleIds: [computeRuleOnRuleId(baseRule.ruleId)],
      skipped: false,
    });
    expect(rulesClient.upsertRule).toHaveBeenCalledWith(
      expect.objectContaining({
        id: computeRuleOnRuleId(baseRule.ruleId),
        data: expect.objectContaining({
          kind: 'signal',
          time_field: '@timestamp',
          evaluation: { query: { base: esql } },
        }),
      })
    );
  });

  it('updates on 409 conflict from upsertRule', async () => {
    const rulesClient = makeRulesClient();
    (rulesClient.upsertRule as jest.Mock).mockRejectedValue(Boom.conflict('exists'));
    const esql = buildCountBasedRuleOnRuleEsql(baseRule.ruleId);
    const plan: RuleOnRulePlan = {
      path: 'count-based',
      rules: [{ esql }],
      reasoning: 'count spike detection',
    };

    await provisionRuleOnRules({
      baseRule,
      plan,
      rulesClient,
      esClient: makeEsClient(),
    });

    expect(rulesClient.updateRule).toHaveBeenCalledWith(
      expect.objectContaining({
        id: computeRuleOnRuleId(baseRule.ruleId),
      })
    );
  });

  it('provisions multiple metric-based children with distinct ids', async () => {
    const rulesClient = makeRulesClient();
    const plan: RuleOnRulePlan = {
      path: 'metric-based',
      rules: [
        {
          esql: `FROM .rule-events | WHERE rule.id == "${baseRule.ruleId}" | EVAL metric_value = TO_DOUBLE(FIELD_EXTRACT(data, "cpu")), bucket = FIELD_EXTRACT(data, "bucket") | CHANGE_POINT metric_value ON bucket | WHERE type IS NOT NULL`,
          metricName: 'cpu',
        },
        {
          esql: `FROM .rule-events | WHERE rule.id == "${baseRule.ruleId}" | EVAL metric_value = TO_DOUBLE(FIELD_EXTRACT(data, "memory")), bucket = FIELD_EXTRACT(data, "bucket") | CHANGE_POINT metric_value ON bucket | WHERE type IS NOT NULL`,
          metricName: 'memory',
        },
      ],
      reasoning: 'multi-metric STATS',
    };

    const result = await provisionRuleOnRules({
      baseRule,
      plan,
      rulesClient,
      esClient: makeEsClient(),
    });

    expect(result.provisionedRuleIds).toEqual([
      computeRuleOnRuleId(baseRule.ruleId, 'cpu'),
      computeRuleOnRuleId(baseRule.ruleId, 'memory'),
    ]);
    expect(rulesClient.upsertRule).toHaveBeenCalledTimes(2);
  });
});
