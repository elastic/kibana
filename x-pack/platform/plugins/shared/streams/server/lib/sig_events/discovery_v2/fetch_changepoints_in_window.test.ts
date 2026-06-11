/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClientApi } from '@kbn/alerting-v2-plugin/server';
import type { IScopedClusterClient } from '@kbn/core/server';
import { TAG_RULE_ON_RULE } from '../rule_on_rule/constants';
import {
  fetchDiscoveryChangepointsInWindow,
  formatDiscoveryChangepointsForInvestigator,
  type DiscoveryChangepointCandidate,
} from './fetch_changepoints_in_window';

function makeRulesClient(items: Array<{ id: string; name: string; tags: string[] }>) {
  return {
    findRules: jest.fn().mockResolvedValue({
      items: items.map((item) => ({
        id: item.id,
        metadata: { name: item.name, tags: item.tags },
      })),
    }),
  } as unknown as RulesClientApi;
}

function makeEsClient(response: { columns: Array<{ name: string }>; values: unknown[][] }) {
  return {
    asCurrentUser: {
      esql: {
        query: jest.fn().mockResolvedValue(response),
      },
    },
  } as unknown as IScopedClusterClient;
}

describe('fetchDiscoveryChangepointsInWindow', () => {
  it('returns empty when no rule-on-rule rules exist', async () => {
    const rulesClient = makeRulesClient([]);
    const esClient = makeEsClient({ columns: [], values: [] });

    const result = await fetchDiscoveryChangepointsInWindow({
      esClient,
      rulesClient,
      lookback: 'now-35s',
    });

    expect(result).toEqual({ candidates: [], ruleOnRuleRuleIds: [] });
    expect(esClient.asCurrentUser.esql.query).not.toHaveBeenCalled();
  });

  it('maps changepoint rows with rule-on-rule metadata', async () => {
    const rulesClient = makeRulesClient([
      {
        id: 'ror-1',
        name: 'Count spike on base rule',
        tags: [TAG_RULE_ON_RULE, 'sigevents:monitored:base-rule-1', 'sigevents:stream:logs.app'],
      },
    ]);

    const esClient = makeEsClient({
      columns: [{ name: 'rule.id' }, { name: '@timestamp' }, { name: 'data' }],
      values: [['ror-1', '2026-06-09T12:00:00.000Z', { type: 'spike', pvalue: 0.01 }]],
    });

    const result = await fetchDiscoveryChangepointsInWindow({
      esClient,
      rulesClient,
      lookback: 'now-35s',
    });

    expect(result.ruleOnRuleRuleIds).toEqual(['ror-1']);
    expect(result.candidates).toEqual([
      {
        ruleOnRuleId: 'ror-1',
        monitoredRuleId: 'base-rule-1',
        streamName: 'logs.app',
        ruleOnRuleName: 'Count spike on base rule',
        timestamp: '2026-06-09T12:00:00.000Z',
        changepointType: 'spike',
        pvalue: 0.01,
        data: { type: 'spike', pvalue: 0.01 },
      },
    ]);
  });

  it('skips rows without changepoint type in data', async () => {
    const rulesClient = makeRulesClient([
      {
        id: 'ror-1',
        name: 'Metric changepoint',
        tags: [TAG_RULE_ON_RULE, 'sigevents:monitored:base-rule-1', 'sigevents:stream:logs.app'],
      },
    ]);

    const esClient = makeEsClient({
      columns: [{ name: 'rule.id' }, { name: '@timestamp' }, { name: 'data' }],
      values: [['ror-1', '2026-06-09T12:00:00.000Z', { pvalue: 0.5 }]],
    });

    const result = await fetchDiscoveryChangepointsInWindow({
      esClient,
      rulesClient,
      lookback: 'now-35s',
    });

    expect(result.candidates).toEqual([]);
  });
});

describe('formatDiscoveryChangepointsForInvestigator', () => {
  it('normalizes candidates into investigator detection docs', () => {
    const candidates: DiscoveryChangepointCandidate[] = [
      {
        ruleOnRuleId: 'ror-1',
        monitoredRuleId: 'base-rule-1',
        streamName: 'logs.app',
        ruleOnRuleName: 'Count spike',
        timestamp: '2026-06-09T12:00:00.000Z',
        changepointType: 'spike',
        pvalue: 0.01,
        data: { type: 'spike', pvalue: 0.01 },
      },
    ];

    expect(formatDiscoveryChangepointsForInvestigator(candidates)).toEqual([
      {
        detection_id: 'ror-1:2026-06-09T12:00:00.000Z',
        rule_on_rule_id: 'ror-1',
        monitored_rule_id: 'base-rule-1',
        rule_uuid: 'base-rule-1',
        rule_name: 'Count spike',
        rule_on_rule_name: 'Count spike',
        stream_name: 'logs.app',
        changepoint_type: 'spike',
        change_point_type: 'spike',
        detected_at: '2026-06-09T12:00:00.000Z',
        detection_evidence: {
          change_point_type: 'spike',
          p_value: 0.01,
        },
      },
    ]);
  });
});
