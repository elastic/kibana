/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClientApi } from '@kbn/alerting-v2-plugin/server';
import { RulesAdapterV2 } from '../../knowledge_indicators/knowledge_indicator_client/rules/v2_rules_adapter';
import { ALERTS_READER_V2 } from './alerts_reader';
import {
  createSignificantEventsAlertingContextResolver,
  canQueryBeRuleBacked,
} from './significant_events_alerting_context';

describe('canQueryBeRuleBacked', () => {
  it('allows filter-only MATCH queries to be rule-backed', () => {
    expect(
      canQueryBeRuleBacked({
        type: 'match',
        esql: { query: 'FROM logs-* | WHERE level == "error"' },
      })
    ).toBe(true);
  });

  it('does not allow STATS queries until rule-on-rule provisioning', () => {
    expect(
      canQueryBeRuleBacked({
        type: 'stats',
        esql: {
          query:
            'FROM logs | STATS metric_value = COUNT(*) BY bucket = BUCKET(@timestamp, 1 minute) | KEEP bucket, metric_value',
        },
      })
    ).toBe(false);
  });

  it('does not allow MATCH queries that are not filter-only', () => {
    expect(
      canQueryBeRuleBacked({
        type: 'match',
        esql: { query: 'FROM logs-* | KEEP message | WHERE level == "error"' },
      })
    ).toBe(false);
  });
});

describe('createSignificantEventsAlertingContextResolver', () => {
  const v2Client = {} as RulesClientApi;

  it('returns the v2 alerts reader and rules adapter', async () => {
    const context = await createSignificantEventsAlertingContextResolver({
      getAlertingV2RulesClient: async () => v2Client,
    })();

    expect(context.alertsReader).toBe(ALERTS_READER_V2);
    expect(context.rulesClient).toBeInstanceOf(RulesAdapterV2);
    expect(context.alertingV2RulesClient).toBe(v2Client);
  });

  it('caches context resolution within a request via the resolver factory', async () => {
    const getAlertingV2RulesClient = jest.fn().mockResolvedValue(v2Client);
    const resolveContext = createSignificantEventsAlertingContextResolver({
      getAlertingV2RulesClient,
    });

    const [first, second] = await Promise.all([resolveContext(), resolveContext()]);

    expect(getAlertingV2RulesClient).toHaveBeenCalledTimes(1);
    expect(first).toBe(second);
    expect(first.alertsReader).toBe(ALERTS_READER_V2);
  });
});
