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
import type { NameValuePair } from '../../../../../server/lib/usage/types';
import { apiTest, buildCreateActionPolicyData, buildCreateRuleData, testData } from '../fixtures';

const sortByName = (buckets: NameValuePair[] | undefined): NameValuePair[] =>
  [...(buckets ?? [])].sort((a, b) => a.name.localeCompare(b.name));

apiTest.describe('Alerting V2 Telemetry', { tag: testData.API_ENGINE_TAG }, () => {
  // The snooze API rejects past dates, so the "expired snooze" policy is snoozed a few
  // seconds into the future and the test waits for it to lapse before running the task.
  let expiredSnoozeUntilMs = 0;

  apiTest.beforeAll(async ({ apiServices }) => {
    await Promise.all([
      apiServices.alertingV2.rules.cleanUp(),
      apiServices.alertingV2.actionPolicies.cleanUp(),
    ]);

    const [, , rule3] = await Promise.all([
      apiServices.alertingV2.rules.create(
        buildCreateRuleData({
          kind: 'alert',
          metadata: { name: 'alert-rule-1' },
          time_field: '@timestamp',
          schedule: { every: '1m', lookback: '5m' },
          query: { base: 'FROM metrics-* | LIMIT 10' },
          grouping: { fields: ['host.name', 'service.name'] },
          no_data: { strategy: 'keep_last', query: 'FROM metrics-* | STATS c = COUNT(*)' },
        })
      ),
      apiServices.alertingV2.rules.create(
        buildCreateRuleData({
          kind: 'signal',
          metadata: { name: 'signal-rule-1' },
          time_field: '@timestamp',
          schedule: { every: '5m' },
          query: { base: 'FROM logs-* | LIMIT 10' },
          recovery: undefined,
          no_data: undefined,
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
          no_data: { strategy: 'keep_last' },
          grouping: undefined,
        })
      ),
      apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({
          name: 'policy-1',
          description: 'policy-1 description',
          destinations: [{ type: 'workflow', id: 'workflow-1' }],
          matcher: { expression: "env == 'production'" },
          grouping: { mode: 'per_field', fields: ['service.name', 'environment'] },
          throttle: { strategy: 'time_interval', interval: '5m' },
        })
      ),
      apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({
          name: 'policy-2',
          description: 'policy-2 description',
          destinations: [{ type: 'workflow', id: 'workflow-2' }],
          throttle: { strategy: 'per_status_interval', interval: '1h' },
        })
      ),
    ]);

    // Status variants: no throttle / grouping, so they count as `none` / `per_alert`.
    const [disabledPolicy, snoozedPolicy, expiredSnoozePolicy] = await Promise.all([
      apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({
          name: 'policy-3-disabled',
          destinations: [
            { type: 'workflow', id: 'workflow-3' },
            { type: 'workflow', id: 'workflow-4' },
          ],
        })
      ),
      apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({
          name: 'policy-4-snoozed',
          destinations: [{ type: 'workflow', id: 'workflow-5' }],
        })
      ),
      apiServices.alertingV2.actionPolicies.create(
        buildCreateActionPolicyData({
          name: 'policy-5-expired-snooze',
          destinations: [{ type: 'workflow', id: 'workflow-6' }],
        })
      ),
    ]);

    expiredSnoozeUntilMs = Date.now() + 3_000;

    await Promise.all([
      apiServices.alertingV2.rules.bulkDisable({ ids: [rule3.id] }),
      apiServices.alertingV2.actionPolicies.disable(disabledPolicy.id),
      apiServices.alertingV2.actionPolicies.snooze(snoozedPolicy.id, '2099-01-01T00:00:00.000Z'),
      apiServices.alertingV2.actionPolicies.snooze(
        expiredSnoozePolicy.id,
        new Date(expiredSnoozeUntilMs).toISOString()
      ),
    ]);
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await Promise.all([
      apiServices.alertingV2.rules.cleanUp(),
      apiServices.alertingV2.actionPolicies.cleanUp(),
    ]);
  });

  apiTest('should retrieve telemetry data in the expected format', async ({ apiServices }) => {
    const untilExpiredSnoozeLapses = expiredSnoozeUntilMs + 100 - Date.now();
    if (untilExpiredSnoozeLapses > 0) {
      await new Promise((resolve) => setTimeout(resolve, untilExpiredSnoozeLapses));
    }

    const state = await apiServices.alertingV2.telemetry.runAndWaitForState();

    expect(state.has_errors).toBe(false);

    // Rule stats
    expect(state.count_total).toBe(7);
    expect(state.count_enabled).toBe(6);
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
      keep_last: 2,
      resolve: 2,
    });

    expect(state.executions_delay_p50_ms).toBeDefined();
    expect(state.executions_delay_p75_ms).toBeDefined();
    expect(state.executions_delay_p95_ms).toBeDefined();
    expect(state.executions_delay_p99_ms).toBeDefined();

    // Action policy stats
    expect(state.action_policies_count).toBe(5);
    expect(state.action_policies_unique_workflow_count).toBe(6);
    expect(state.action_policies_count_with_matcher).toBe(1);
    expect(state.action_policies_count_with_group_by).toBe(1);
    expect(state.action_policies_avg_group_by_fields_count).toBe(2);
    expect(sortByName(state.action_policies_count_by_throttle_interval)).toStrictEqual([
      { name: '1h', value: 1 },
      { name: '5m', value: 1 },
    ]);
    // An expired snooze counts as enabled.
    expect(state.action_policies_count_by_status).toStrictEqual({
      enabled: 3,
      disabled: 1,
      snoozed: 1,
    });
    expect(state.action_policies_count_by_grouping_mode).toStrictEqual({
      per_alert: 4,
      per_field: 1,
    });
    expect(state.action_policies_count_by_throttle_strategy).toStrictEqual({
      time_interval: 1,
      per_status_interval: 1,
      none: 3,
    });
    expect(state.action_policies_workflows_per_policy?.p50).toBe(1);
    expect(state.action_policies_workflows_per_policy?.p99).toBeGreaterThanOrEqual(1);
    expect(state.action_policies_workflows_per_policy?.p99).toBeLessThanOrEqual(2);
    expect(state.action_policies_workflows_per_policy?.avg).toBeCloseTo(1.2);
    expect(state.action_policies_count_with_multiple_workflows).toBe(1);
  });
});
