/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * We exclude `@kbn/eslint/scout_require_api_client_in_api_test` for this spec
 * because we are not testing an HTTP endpoint — we drive the alerting_v2
 * telemetry background task and observe the resulting task state via the
 * telemetry service. All endpoint and ES access is encapsulated in
 * `apiServices`, which is the right tool here. The same exclusion is used by
 * `dispatcher.spec.ts` and `rule_executor.spec.ts` for the equivalent reason.
 */

/* eslint-disable @kbn/eslint/scout_require_api_client_in_api_test */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import type { NameValuePair } from '../../../../../server/lib/usage/types';
import { AGENT_BUILDER_TAG } from '../../../../../server/agent_builder/common/constants';
import { apiTest, buildCreateActionPolicyData, buildCreateRuleData } from '../fixtures';

const sortByName = (buckets: NameValuePair[] | undefined): NameValuePair[] =>
  [...(buckets ?? [])].sort((a, b) => a.name.localeCompare(b.name));

apiTest.describe('Alerting V2 Telemetry', { tag: tags.stateful.classic }, () => {
  apiTest.beforeAll(async ({ apiServices }) => {
    await Promise.all([
      apiServices.alertingV2.rules.cleanUp(),
      apiServices.alertingV2.actionPolicies.cleanUp(),
    ]);

    const [, , rule3] = await Promise.all([
      apiServices.alertingV2.rules.create(
        buildCreateRuleData({
          kind: 'alert',
          metadata: { name: 'alert-rule-1', tags: [AGENT_BUILDER_TAG] },
          time_field: '@timestamp',
          schedule: { every: '1m', lookback: '5m' },
          query: { base: 'FROM metrics-* | LIMIT 10' },
          grouping: { fields: ['host.name', 'service.name'] },
          no_data: { strategy: 'keep_last', query: 'FROM metrics-* | STATS c = COUNT(*)' },
          // Omitting `recovery` lets the server apply its `no_breach` default.
          recovery: undefined,
        })
      ),
      apiServices.alertingV2.rules.create(
        buildCreateRuleData({
          kind: 'signal',
          metadata: { name: 'signal-rule-1' },
          time_field: '@timestamp',
          schedule: { every: '5m' },
          query: { base: 'FROM logs-* | LIMIT 10' },
          // Signal rules forbid state_transition and recovery; grouping omitted to match original.
          recovery: undefined,
          state_transition: undefined,
          grouping: undefined,
        })
      ),
      apiServices.alertingV2.rules.create(
        buildCreateRuleData({
          kind: 'alert',
          metadata: { name: 'alert-rule-2' },
          time_field: '@timestamp',
          schedule: { every: '5m' },
          query: { base: 'FROM metrics-* | LIMIT 5' },
          no_data: { strategy: 'resolve', query: 'FROM metrics-* | STATS c = COUNT(*)' },
          recovery: undefined,
          grouping: undefined,
        })
      ),
      apiServices.alertingV2.rules.create(
        buildCreateRuleData({
          kind: 'alert',
          metadata: { name: 'alert-rule-3' },
          time_field: '@timestamp',
          schedule: { every: '5m' },
          query: { base: 'FROM metrics-* | LIMIT 5' },
          recovery: { strategy: 'query', query: 'FROM metrics-* | LIMIT 3' },
          grouping: undefined,
        })
      ),
      apiServices.alertingV2.rules.create(
        buildCreateRuleData({
          kind: 'alert',
          metadata: { name: 'alert-rule-4' },
          time_field: '@timestamp',
          schedule: { every: '5m' },
          query: { base: 'FROM metrics-* | LIMIT 5' },
          recovery: { strategy: 'manual' },
          no_data: { strategy: 'ignore' },
          grouping: undefined,
        })
      ),
      apiServices.alertingV2.rules.create(
        buildCreateRuleData({
          kind: 'alert',
          metadata: { name: 'alert-rule-5' },
          time_field: '@timestamp',
          schedule: { every: '5m', lookback: '10m' },
          query: {
            base: 'FROM metrics-* | STATS count = COUNT(*) BY host.name',
            breach: { segment: '| WHERE count > 5' },
          },
          no_data: { strategy: 'resolve' },
          recovery: { strategy: 'no_breach' },
          grouping: undefined,
        })
      ),
      apiServices.alertingV2.rules.create(
        buildCreateRuleData({
          kind: 'alert',
          metadata: { name: 'alert-rule-6' },
          time_field: '@timestamp',
          schedule: { every: '5m' },
          query: {
            base: 'FROM metrics-* | STATS count = COUNT(*) BY host.name',
            breach: { segment: 'WHERE count > 5' },
          },
          recovery: { strategy: 'condition', segment: 'WHERE count <= 5' },
          no_data: { strategy: 'alert' },
          grouping: undefined,
        })
      ),
      apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({
          name: 'policy-1',
          description: 'policy-1 description',
          destinations: [{ type: 'workflow', id: 'workflow-1' }],
          matcher: { expression: "env == 'production'" },
          group_by: ['service.name', 'environment'],
          throttle: { interval: '5m' },
        })
      ),
      apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({
          name: 'policy-2',
          description: 'policy-2 description',
          destinations: [{ type: 'workflow', id: 'workflow-2' }],
          throttle: { interval: '1h' },
        })
      ),
    ]);

    await apiServices.alertingV2.rules.bulkDisable({ ids: [rule3.id] });
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await Promise.all([
      apiServices.alertingV2.rules.cleanUp(),
      apiServices.alertingV2.actionPolicies.cleanUp(),
    ]);
  });

  apiTest('should retrieve telemetry data in the expected format', async ({ apiServices }) => {
    const state = await apiServices.alertingV2.telemetry.runAndWaitForState();

    expect(state.has_errors).toBe(false);

    // Rule stats
    expect(state.count_total).toBe(7);
    expect(state.count_enabled).toBe(6);
    expect(state.count_agent_builder_assisted).toBe(1);
    expect(state.count_by_kind).toStrictEqual({ alert: 6, signal: 1 });
    expect(sortByName(state.count_by_schedule)).toStrictEqual([
      { name: '1m', value: 1 },
      { name: '5m', value: 6 },
    ]);
    expect(sortByName(state.count_by_lookback)).toStrictEqual([
      { name: '10m', value: 1 },
      { name: '5m', value: 1 },
    ]);
    expect(state.count_with_grouping).toBe(1);
    expect(state.avg_grouping_fields_count).toBe(2);
    expect(state.count_by_recovery_strategy).toStrictEqual({
      no_breach: 3,
      query: 1,
      condition: 1,
      manual: 1,
    });
    expect(state.count_by_no_data_strategy).toStrictEqual({
      ignore: 2,
      keep_last: 1,
      resolve: 2,
      alert: 1,
    });

    expect(state.executions_delay_p50_ms).toBeDefined();
    expect(state.executions_delay_p75_ms).toBeDefined();
    expect(state.executions_delay_p95_ms).toBeDefined();
    expect(state.executions_delay_p99_ms).toBeDefined();

    // Action policy stats
    expect(state.action_policies_count).toBe(2);
    expect(state.action_policies_unique_workflow_count).toBe(2);
    expect(state.action_policies_count_with_matcher).toBe(1);
    expect(state.action_policies_count_with_group_by).toBe(1);
    expect(state.action_policies_avg_group_by_fields_count).toBe(2);
    expect(sortByName(state.action_policies_count_by_throttle_interval)).toStrictEqual([
      { name: '1h', value: 1 },
      { name: '5m', value: 1 },
    ]);
  });
});
