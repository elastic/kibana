/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Scout migration of:
 *   x-pack/platform/test/alerting_api_integration/security_and_spaces/group1/
 *   tests/alerting/backfill/schedule.ts
 *
 * Covers: happy-path scheduling, input validation, missing/disabled/deleted rule
 * errors, mixed-result batch, unsupported-action warnings, and two RBAC scenarios.
 *
 * Out of scope (require direct ES / task-manager access not available in Scout):
 *   - Verification of ad_hoc_run saved-object content
 *   - Verification of task-manager task records
 *   - checkAAD assertions
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test, makeBackfillRule, makeEsQueryRule } from '../fixtures';

const BACKFILL_SCHEDULE_PATH = '/internal/alerting/rules/backfill/_schedule';
const RULE_CREATE_PATH = '/api/alerting/rule';

function daysAgoIso(days: number, startOfDay = true): string {
  const d = new Date();
  if (startOfDay) {
    d.setUTCHours(0, 0, 0, 0);
  }
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

test.describe('backfill schedule API', { tag: tags.stateful.classic }, () => {
  const createdRuleIds: string[] = [];
  const createdBackfillIds: string[] = [];

  test.beforeAll(async ({ kbnClient }) => {
    // Pre-clean stale rules from previous failed runs
    await kbnClient
      .request({
        method: 'GET',
        path: '/api/alerting/rules/_find?search=scout-backfill&search_fields=name&per_page=100',
        headers: { 'kbn-xsrf': 'scout' },
      })
      .then((res: any) => {
        const rules: Array<{ id: string }> = res.data?.data ?? [];
        return Promise.allSettled(
          rules.map((r) =>
            kbnClient.request({
              method: 'DELETE',
              path: `/api/alerting/rule/${r.id}`,
              headers: { 'kbn-xsrf': 'scout' },
              ignoreErrors: [404],
            })
          )
        );
      })
      .catch(() => {});
  });

  test.afterEach(async ({ kbnClient }) => {
    await Promise.allSettled(
      createdBackfillIds.splice(0).map((id) =>
        kbnClient.request({
          method: 'DELETE',
          path: `/internal/alerting/rules/backfill/${id}`,
          headers: { 'kbn-xsrf': 'scout', 'x-elastic-internal-origin': 'scout' },
          ignoreErrors: [404],
        })
      )
    );
    await Promise.allSettled(
      createdRuleIds.splice(0).map((id) =>
        kbnClient.request({
          method: 'DELETE',
          path: `/api/alerting/rule/${id}`,
          headers: { 'kbn-xsrf': 'scout' },
          ignoreErrors: [404],
        })
      )
    );
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Happy path: two rules, one range each
  // ────────────────────────────────────────────────────────────────────────────
  test('schedules backfill for two rules successfully', async ({ kbnClient }) => {
    const defaultStart = daysAgoIso(7);
    const defaultEnd = daysAgoIso(1);

    const rule1Res = await kbnClient.request<{ id: string }>({
      method: 'POST',
      path: RULE_CREATE_PATH,
      headers: { 'kbn-xsrf': 'scout' },
      body: makeBackfillRule('scout-backfill-sched-a'),
    });
    const ruleId1 = rule1Res.data.id;
    createdRuleIds.push(ruleId1);

    const rule2Res = await kbnClient.request<{ id: string }>({
      method: 'POST',
      path: RULE_CREATE_PATH,
      headers: { 'kbn-xsrf': 'scout' },
      body: makeBackfillRule('scout-backfill-sched-a'),
    });
    const ruleId2 = rule2Res.data.id;
    createdRuleIds.push(ruleId2);

    const schedRes = await kbnClient.request<Array<Record<string, unknown>>>({
      method: 'POST',
      path: BACKFILL_SCHEDULE_PATH,
      headers: { 'kbn-xsrf': 'scout', 'x-elastic-internal-origin': 'scout' },
      body: [
        { rule_id: ruleId1, ranges: [{ start: defaultStart, end: defaultEnd }] },
        {
          rule_id: ruleId2,
          ranges: [
            {
              start: defaultStart,
              end: new Date(new Date(defaultStart).getTime() + 12 * 60 * 60 * 1000).toISOString(),
            },
          ],
        },
      ],
    });

    const result = schedRes.data;
    expect(result).toHaveLength(2);

    // First backfill
    expect(typeof result[0].id).toBe('string');
    createdBackfillIds.push(result[0].id as string);
    expect(result[0].duration).toBe('12h');
    expect(result[0].enabled).toBe(true);
    expect(result[0].start).toStrictEqual(defaultStart);
    expect(result[0].end).toStrictEqual(defaultEnd);
    expect(result[0].status).toBe('pending');
    expect(typeof result[0].created_at).toBe('string');
    expect((result[0] as any).rule.id).toStrictEqual(ruleId1);
    expect((result[0] as any).rule.rule_type_id).toBe('siem.queryRule');
    expect((result[0] as any).rule.consumer).toBe('siem');
    expect(result[0].initiator).toBe('user');
    expect(result[0].initiator_id).toBeUndefined();

    // Schedule entries are spaced 12h apart
    const schedule0 = result[0].schedule as Array<Record<string, unknown>>;
    let currentStart = defaultStart;
    for (const sched of schedule0) {
      expect(sched.interval).toBe('12h');
      expect(sched.status).toBe('pending');
      const expectedRunAt = new Date(
        new Date(currentStart).getTime() + 12 * 60 * 60 * 1000
      ).toISOString();
      expect(sched.run_at).toStrictEqual(expectedRunAt);
      currentStart = expectedRunAt;
    }

    // Second backfill (single 12h window)
    expect(typeof result[1].id).toBe('string');
    createdBackfillIds.push(result[1].id as string);
    expect(result[1].duration).toBe('12h');
    expect(result[1].start).toStrictEqual(defaultStart);
    expect(result[1].status).toBe('pending');
    expect((result[1] as any).rule.id).toStrictEqual(ruleId2);
    const schedule1 = result[1].schedule as Array<Record<string, unknown>>;
    expect(schedule1).toHaveLength(1);
    expect(schedule1[0].interval).toBe('12h');
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Happy path: multiple ranges for a single rule
  // ────────────────────────────────────────────────────────────────────────────
  test('schedules multiple ranges for a single rule', async ({ kbnClient }) => {
    const start1 = daysAgoIso(7);
    const end1 = daysAgoIso(4);
    const start2 = daysAgoIso(8);
    const start3 = daysAgoIso(14);
    const end3 = daysAgoIso(12);

    const ruleRes = await kbnClient.request<{ id: string }>({
      method: 'POST',
      path: RULE_CREATE_PATH,
      headers: { 'kbn-xsrf': 'scout' },
      body: makeBackfillRule('scout-backfill-multi'),
    });
    const ruleId = ruleRes.data.id;
    createdRuleIds.push(ruleId);

    const schedRes = await kbnClient.request<Array<Record<string, unknown>>>({
      method: 'POST',
      path: BACKFILL_SCHEDULE_PATH,
      headers: { 'kbn-xsrf': 'scout', 'x-elastic-internal-origin': 'scout' },
      body: [
        { rule_id: ruleId, ranges: [{ start: start1, end: end1 }] },
        {
          rule_id: ruleId,
          ranges: [
            {
              start: start2,
              end: new Date(new Date(start2).getTime() + 12 * 60 * 60 * 1000).toISOString(),
            },
          ],
        },
        { rule_id: ruleId, ranges: [{ start: start3, end: end3 }] },
      ],
    });

    const result = schedRes.data;
    expect(result).toHaveLength(3);

    for (const r of result) {
      expect(typeof r.id).toBe('string');
      createdBackfillIds.push(r.id as string);
      expect(r.enabled).toBe(true);
      expect(r.status).toBe('pending');
      expect((r as any).rule.id).toStrictEqual(ruleId);
    }

    expect(result[0].start).toStrictEqual(start1);
    expect(result[0].end).toStrictEqual(end1);
    expect(result[1].start).toStrictEqual(start2);
    expect(result[2].start).toStrictEqual(start3);
    expect(result[2].end).toStrictEqual(end3);
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Validation: invalid / out-of-range parameters
  // ────────────────────────────────────────────────────────────────────────────
  test('returns 400 for invalid schedule parameters', async ({ kbnClient }) => {
    const validStart = daysAgoIso(7);

    // invalid start
    const r1 = await kbnClient.request({
      method: 'POST',
      path: BACKFILL_SCHEDULE_PATH,
      headers: { 'kbn-xsrf': 'scout', 'x-elastic-internal-origin': 'scout' },
      body: [{ rule_id: 'irrelevant', ranges: [{ start: 'foo', end: 'bar' }] }],
      ignoreErrors: [400],
    });
    expect((r1 as any).status).toBe(400);
    expect((r1.data as any).message).toBe('[request body.0]: Backfill start must be valid date');

    // invalid end
    const r2 = await kbnClient.request({
      method: 'POST',
      path: BACKFILL_SCHEDULE_PATH,
      headers: { 'kbn-xsrf': 'scout', 'x-elastic-internal-origin': 'scout' },
      body: [{ rule_id: 'irrelevant', ranges: [{ start: validStart, end: 'foo' }] }],
      ignoreErrors: [400],
    });
    expect((r2 as any).status).toBe(400);
    expect((r2.data as any).message).toBe('[request body.0]: Backfill end must be valid date');

    // end === start
    const r3 = await kbnClient.request({
      method: 'POST',
      path: BACKFILL_SCHEDULE_PATH,
      headers: { 'kbn-xsrf': 'scout', 'x-elastic-internal-origin': 'scout' },
      body: [{ rule_id: 'irrelevant', ranges: [{ start: validStart, end: validStart }] }],
      ignoreErrors: [400],
    });
    expect((r3 as any).status).toBe(400);
    expect((r3.data as any).message).toBe(
      '[request body.0]: Backfill end must be greater than backfill start'
    );

    // end before start
    const r4 = await kbnClient.request({
      method: 'POST',
      path: BACKFILL_SCHEDULE_PATH,
      headers: { 'kbn-xsrf': 'scout', 'x-elastic-internal-origin': 'scout' },
      body: [{ rule_id: 'irrelevant', ranges: [{ start: daysAgoIso(7), end: daysAgoIso(8) }] }],
      ignoreErrors: [400],
    });
    expect((r4 as any).status).toBe(400);
    expect((r4.data as any).message).toBe(
      '[request body.0]: Backfill end must be greater than backfill start'
    );

    // start too far in the past (>90 days)
    const r5 = await kbnClient.request({
      method: 'POST',
      path: BACKFILL_SCHEDULE_PATH,
      headers: { 'kbn-xsrf': 'scout', 'x-elastic-internal-origin': 'scout' },
      body: [
        {
          rule_id: 'irrelevant',
          ranges: [{ start: '2023-04-30T00:00:00.000Z', end: '2023-04-30T00:10:00.000Z' }],
        },
      ],
      ignoreErrors: [400],
    });
    expect((r5 as any).status).toBe(400);
    expect((r5.data as any).message).toBe(
      '[request body.0]: Backfill cannot look back more than 90 days'
    );

    // start in the future
    const futureStart = new Date();
    futureStart.setUTCHours(0, 0, 0, 0);
    futureStart.setUTCDate(futureStart.getUTCDate() + 1);
    const futureEnd = new Date(futureStart);
    futureEnd.setUTCDate(futureEnd.getUTCDate() + 1);
    const r6 = await kbnClient.request({
      method: 'POST',
      path: BACKFILL_SCHEDULE_PATH,
      headers: { 'kbn-xsrf': 'scout', 'x-elastic-internal-origin': 'scout' },
      body: [
        {
          rule_id: 'irrelevant',
          ranges: [{ start: futureStart.toISOString(), end: futureEnd.toISOString() }],
        },
      ],
      ignoreErrors: [400],
    });
    expect((r6 as any).status).toBe(400);
    expect((r6.data as any).message).toBe(
      '[request body.0]: Backfill cannot be scheduled for the future'
    );

    // end in the future
    const pastStart = new Date();
    pastStart.setUTCHours(0, 0, 0, 0);
    pastStart.setUTCDate(pastStart.getUTCDate() - 1);
    const r7 = await kbnClient.request({
      method: 'POST',
      path: BACKFILL_SCHEDULE_PATH,
      headers: { 'kbn-xsrf': 'scout', 'x-elastic-internal-origin': 'scout' },
      body: [
        {
          rule_id: 'irrelevant',
          ranges: [{ start: pastStart.toISOString(), end: futureStart.toISOString() }],
        },
      ],
      ignoreErrors: [400],
    });
    expect((r7 as any).status).toBe(400);
    expect((r7.data as any).message).toBe(
      '[request body.0]: Backfill cannot be scheduled for the future'
    );
  });

  // ────────────────────────────────────────────────────────────────────────────
  // No matching rule
  // ────────────────────────────────────────────────────────────────────────────
  test('returns 400 when no rules match the given IDs', async ({ kbnClient }) => {
    const res = await kbnClient.request({
      method: 'POST',
      path: BACKFILL_SCHEDULE_PATH,
      headers: { 'kbn-xsrf': 'scout', 'x-elastic-internal-origin': 'scout' },
      body: [
        {
          rule_id: 'ac612b4b-5d0c-46d7-855a-98dd920e3aa6',
          ranges: [{ start: daysAgoIso(7), end: daysAgoIso(6) }],
        },
      ],
      ignoreErrors: [400],
    });
    expect((res as any).status).toBe(400);
    expect((res.data as any).message).toBe(
      'No rules matching ids ac612b4b-5d0c-46d7-855a-98dd920e3aa6 found to schedule backfill'
    );
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Mixed success and failure in a single batch
  // ────────────────────────────────────────────────────────────────────────────
  test('returns mixed success and error results for a batch request', async ({ kbnClient }) => {
    const start = daysAgoIso(14);
    const end = daysAgoIso(5);
    const end2 = new Date(new Date(start).getTime() + 12 * 60 * 60 * 1000).toISOString();

    // Create two backfill-supporting rules
    const r1Res = await kbnClient.request<{ id: string }>({
      method: 'POST',
      path: RULE_CREATE_PATH,
      headers: { 'kbn-xsrf': 'scout' },
      body: makeBackfillRule('scout-backfill-mix'),
    });
    const ruleId1 = r1Res.data.id;
    createdRuleIds.push(ruleId1);

    const r2Res = await kbnClient.request<{ id: string }>({
      method: 'POST',
      path: RULE_CREATE_PATH,
      headers: { 'kbn-xsrf': 'scout' },
      body: makeBackfillRule('scout-backfill-mix'),
    });
    const ruleId2 = r2Res.data.id;
    createdRuleIds.push(ruleId2);

    // Create a lifecycle rule (.es-query has autoRecoverAlerts:true — not backfill-supported)
    // makeEsQueryRule uses camelCase ruleTypeId for the Scout API; rename to rule_type_id for raw kbnClient call
    const { ruleTypeId: lifecycleRuleTypeId, ...lifecycleRuleBase } = makeEsQueryRule(
      'scout-backfill-lifecycle'
    );
    const lifecycleRuleRes = await kbnClient.request<{ id: string }>({
      method: 'POST',
      path: RULE_CREATE_PATH,
      headers: { 'kbn-xsrf': 'scout' },
      body: { ...lifecycleRuleBase, rule_type_id: lifecycleRuleTypeId, enabled: true },
    });
    const lifecycleRuleId = lifecycleRuleRes.data.id;
    createdRuleIds.push(lifecycleRuleId);

    // Create a disabled rule
    const disabledRuleRes = await kbnClient.request<{ id: string }>({
      method: 'POST',
      path: RULE_CREATE_PATH,
      headers: { 'kbn-xsrf': 'scout' },
      body: { ...makeBackfillRule('scout-backfill-disabled'), enabled: false },
    });
    const disabledRuleId = disabledRuleRes.data.id;
    createdRuleIds.push(disabledRuleId);

    // Create a rule then delete it
    const deletedRuleRes = await kbnClient.request<{ id: string }>({
      method: 'POST',
      path: RULE_CREATE_PATH,
      headers: { 'kbn-xsrf': 'scout' },
      body: { ...makeBackfillRule('scout-backfill-deleted'), enabled: false },
    });
    const deletedRuleId = deletedRuleRes.data.id;
    await kbnClient.request({
      method: 'DELETE',
      path: `/api/alerting/rule/${deletedRuleId}`,
      headers: { 'kbn-xsrf': 'scout' },
    });

    const schedRes = await kbnClient.request<Array<Record<string, unknown>>>({
      method: 'POST',
      path: BACKFILL_SCHEDULE_PATH,
      headers: { 'kbn-xsrf': 'scout', 'x-elastic-internal-origin': 'scout' },
      body: [
        { rule_id: ruleId1, ranges: [{ start, end }] },
        { rule_id: ruleId2, ranges: [{ start, end: end2 }] },
        { rule_id: lifecycleRuleId, ranges: [{ start, end: end2 }] },
        { rule_id: disabledRuleId, ranges: [{ start, end: end2 }] },
        { rule_id: deletedRuleId, ranges: [{ start, end: end2 }] },
        { rule_id: ruleId1, ranges: [{ start, end: end2 }] },
      ],
    });

    const result = schedRes.data;
    expect(result).toHaveLength(6);

    // Indices 0, 1, 5 are successful backfills
    for (const idx of [0, 1, 5]) {
      expect(typeof result[idx].id).toBe('string');
      createdBackfillIds.push(result[idx].id as string);
      expect(result[idx].status).toBe('pending');
      expect(result[idx].enabled).toBe(true);
    }

    expect((result[0] as any).rule.id).toStrictEqual(ruleId1);
    expect((result[1] as any).rule.id).toStrictEqual(ruleId2);
    expect((result[5] as any).rule.id).toStrictEqual(ruleId1);

    // Index 2: lifecycle rule — not supported for backfill
    expect((result[2] as any).error).toBeDefined();
    expect((result[2] as any).error.message).toContain('is not supported');
    expect((result[2] as any).error.rule.id).toStrictEqual(lifecycleRuleId);

    // Index 3: disabled rule
    expect((result[3] as any).error).toBeDefined();
    expect((result[3] as any).error.message).toContain('is disabled');
    expect((result[3] as any).error.rule.id).toStrictEqual(disabledRuleId);

    // Index 4: deleted rule
    expect((result[4] as any).error).toBeDefined();
    expect((result[4] as any).error.message).toContain('not found');
    expect((result[4] as any).error.rule.id).toStrictEqual(deletedRuleId);
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Unsupported-action warning when run_actions:true
  // ────────────────────────────────────────────────────────────────────────────
  test('includes warning for non-summary actions when run_actions is true', async ({
    kbnClient,
  }) => {
    const start = daysAgoIso(14);
    const end = daysAgoIso(5);

    // Create an index connector
    const connRes = await kbnClient.request<{ id: string }>({
      method: 'POST',
      path: '/api/actions/connector',
      headers: { 'kbn-xsrf': 'scout' },
      body: {
        name: 'scout-backfill-index-connector',
        connector_type_id: '.index',
        config: { index: 'scout-backfill-test-actions', refresh: true },
        secrets: {},
      },
    });
    const connectorId = connRes.data.id;

    // Rule with summary action (supported) + non-summary action (unsupported in backfill)
    const rule1Res = await kbnClient.request<{ id: string }>({
      method: 'POST',
      path: RULE_CREATE_PATH,
      headers: { 'kbn-xsrf': 'scout' },
      body: {
        ...makeBackfillRule('scout-backfill-act'),
        actions: [
          {
            group: 'default',
            id: connectorId,
            uuid: '111-111',
            params: { documents: [{ alertUuid: '{{alert.uuid}}' }] },
            frequency: { notify_when: 'onActiveAlert', throttle: null, summary: true },
          },
          {
            group: 'default',
            id: connectorId,
            uuid: '222-222',
            params: { documents: [{ alertUuid: '{{alert.uuid}}' }] },
            frequency: { notify_when: 'onActionGroupChange', throttle: null, summary: true },
          },
        ],
      },
    });
    const ruleId1 = rule1Res.data.id;
    createdRuleIds.push(ruleId1);

    // Rule with per-alert (non-summary) action — fully supported
    const rule2Res = await kbnClient.request<{ id: string }>({
      method: 'POST',
      path: RULE_CREATE_PATH,
      headers: { 'kbn-xsrf': 'scout' },
      body: {
        ...makeBackfillRule('scout-backfill-act'),
        actions: [
          {
            group: 'default',
            id: connectorId,
            uuid: '333-333',
            params: { documents: [{ alertUuid: '{{alert.uuid}}' }] },
            frequency: { notify_when: 'onActiveAlert', throttle: null, summary: false },
          },
        ],
      },
    });
    const ruleId2 = rule2Res.data.id;
    createdRuleIds.push(ruleId2);

    const schedRes = await kbnClient.request<Array<Record<string, unknown>>>({
      method: 'POST',
      path: BACKFILL_SCHEDULE_PATH,
      headers: { 'kbn-xsrf': 'scout', 'x-elastic-internal-origin': 'scout' },
      body: [
        { rule_id: ruleId1, ranges: [{ start, end }], run_actions: true },
        { rule_id: ruleId2, ranges: [{ start, end }], run_actions: true },
      ],
    });

    const result = schedRes.data;
    expect(result).toHaveLength(2);

    expect(typeof result[0].id).toBe('string');
    createdBackfillIds.push(result[0].id as string);
    // Only the per-alert (summary:false) action is unsupported; it should be filtered out
    // Result rule has only the supported summary action retained
    expect((result[0] as any).rule.actions).toHaveLength(1);
    const warnings = result[0].warnings as string[] | undefined;
    expect(warnings).toBeDefined();
    expect(warnings![0]).toContain('not supported for backfill');

    expect(typeof result[1].id).toBe('string');
    createdBackfillIds.push(result[1].id as string);
    expect((result[1] as any).rule.actions).toHaveLength(1);
    expect(result[1].warnings).toBeUndefined();

    // Cleanup connector
    await kbnClient.request({
      method: 'DELETE',
      path: `/api/actions/connector/${connectorId}`,
      headers: { 'kbn-xsrf': 'scout' },
      ignoreErrors: [404],
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // RBAC: user with no Kibana privileges gets 403
  // ────────────────────────────────────────────────────────────────────────────
  test('returns 403 for a user with no Kibana privileges', async ({
    browserAuth,
    kbnClient,
    kbnUrl,
    page,
  }) => {
    await browserAuth.loginWithCustomRole({
      elasticsearch: { cluster: [], indices: [] },
      kibana: [],
    });

    const ruleRes = await kbnClient.request<{ id: string }>({
      method: 'POST',
      path: RULE_CREATE_PATH,
      headers: { 'kbn-xsrf': 'scout' },
      body: makeBackfillRule('scout-backfill-rbac'),
    });
    const ruleId = ruleRes.data.id;
    createdRuleIds.push(ruleId);

    const response = await page.context().request.post(kbnUrl.get(BACKFILL_SCHEDULE_PATH), {
      headers: {
        'kbn-xsrf': 'scout',
        'x-elastic-internal-origin': 'scout',
        'Content-Type': 'application/json',
      },
      data: JSON.stringify([
        { rule_id: ruleId, ranges: [{ start: daysAgoIso(7), end: daysAgoIso(1) }] },
      ]),
    });

    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body.statusCode).toBe(403);
    expect(body.message).toContain('Unauthorized to find rules for any rule types');
  });

  // ────────────────────────────────────────────────────────────────────────────
  // RBAC: viewer (read-only) cannot schedule backfill
  // ────────────────────────────────────────────────────────────────────────────
  test('returns 403 for a read-only viewer trying to schedule backfill', async ({
    browserAuth,
    kbnClient,
    kbnUrl,
    page,
  }) => {
    await browserAuth.loginWithCustomRole({
      elasticsearch: { cluster: [], indices: [] },
      kibana: [{ base: ['read'], feature: {}, spaces: ['default'] }],
    });

    const ruleRes = await kbnClient.request<{ id: string }>({
      method: 'POST',
      path: RULE_CREATE_PATH,
      headers: { 'kbn-xsrf': 'scout' },
      body: makeBackfillRule('scout-backfill-rbac-ro'),
    });
    const ruleId = ruleRes.data.id;
    createdRuleIds.push(ruleId);

    const response = await page.context().request.post(kbnUrl.get(BACKFILL_SCHEDULE_PATH), {
      headers: {
        'kbn-xsrf': 'scout',
        'x-elastic-internal-origin': 'scout',
        'Content-Type': 'application/json',
      },
      data: JSON.stringify([
        { rule_id: ruleId, ranges: [{ start: daysAgoIso(7), end: daysAgoIso(1) }] },
      ]),
    });

    expect(response.status()).toBe(403);
  });
});
