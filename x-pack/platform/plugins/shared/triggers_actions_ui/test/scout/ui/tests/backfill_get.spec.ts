/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Scout migration of:
 *   x-pack/platform/test/alerting_api_integration/security_and_spaces/group1/
 *   tests/alerting/backfill/get.ts
 *
 * Covers: getting an existing backfill, not-found error, cross-space access
 * restriction, and RBAC (no-privileges user is denied).
 *
 * Out of scope: ES-level saved-object content verification.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test, makeBackfillRule } from '../fixtures';

const RULE_CREATE_PATH = '/api/alerting/rule';
const BACKFILL_SCHEDULE_PATH = '/internal/alerting/rules/backfill/_schedule';

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

function backfillGetPath(id: string, spaceId?: string) {
  const prefix = spaceId ? `/s/${spaceId}` : '';
  return `${prefix}/internal/alerting/rules/backfill/${id}`;
}

test.describe('backfill get API', { tag: tags.stateful.classic }, () => {
  const createdRuleIds: string[] = [];
  const createdBackfillIds: string[] = [];

  const start = daysAgoIso(7);
  const end1 = daysAgoIso(1);
  const end2 = daysAgoIso(3);

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
  // Happy path: get two backfills
  // ────────────────────────────────────────────────────────────────────────────
  test('gets existing backfills by ID', async ({ kbnClient }) => {
    const rule1Res = await kbnClient.request<{ id: string }>({
      method: 'POST',
      path: RULE_CREATE_PATH,
      headers: { 'kbn-xsrf': 'scout' },
      body: makeBackfillRule('scout-backfill-get'),
    });
    const ruleId1 = rule1Res.data.id;
    createdRuleIds.push(ruleId1);

    const rule2Res = await kbnClient.request<{ id: string }>({
      method: 'POST',
      path: RULE_CREATE_PATH,
      headers: { 'kbn-xsrf': 'scout' },
      body: makeBackfillRule('scout-backfill-get'),
    });
    const ruleId2 = rule2Res.data.id;
    createdRuleIds.push(ruleId2);

    const schedRes = await kbnClient.request<Array<{ id: string }>>({
      method: 'POST',
      path: BACKFILL_SCHEDULE_PATH,
      headers: { 'kbn-xsrf': 'scout', 'x-elastic-internal-origin': 'scout' },
      body: [
        { rule_id: ruleId1, ranges: [{ start, end: end1 }] },
        { rule_id: ruleId2, ranges: [{ start, end: end2 }] },
      ],
    });

    const backfillId1 = schedRes.data[0].id;
    const backfillId2 = schedRes.data[1].id;
    createdBackfillIds.push(backfillId1, backfillId2);

    const get1 = await kbnClient.request<Record<string, unknown>>({
      method: 'GET',
      path: backfillGetPath(backfillId1),
      headers: { 'kbn-xsrf': 'scout', 'x-elastic-internal-origin': 'scout' },
    });

    expect(get1.data.id).toStrictEqual(backfillId1);
    expect(get1.data.duration).toBe('12h');
    expect(get1.data.enabled).toBe(true);
    expect(get1.data.start).toStrictEqual(start);
    expect(get1.data.end).toStrictEqual(end1);
    expect(get1.data.status).toBe('pending');
    expect(get1.data.initiator).toBe('user');
    expect(get1.data.initiator_id).toBeUndefined();
    expect(typeof get1.data.created_at).toBe('string');
    expect((get1.data as any).rule.id).toStrictEqual(ruleId1);
    expect((get1.data as any).rule.rule_type_id).toBe('siem.queryRule');
    const schedule1 = get1.data.schedule as Array<Record<string, unknown>>;
    // 7 days ÷ 12h = 14 schedule slots (start=7 days ago, end=1 day ago = 6 days = 12 slots)
    expect(schedule1.length).toBeGreaterThan(0);
    for (const sched of schedule1) {
      expect(sched.interval).toBe('12h');
      expect(sched.status).toMatch(/complete|pending|running|error|timeout/);
    }

    const get2 = await kbnClient.request<Record<string, unknown>>({
      method: 'GET',
      path: backfillGetPath(backfillId2),
      headers: { 'kbn-xsrf': 'scout', 'x-elastic-internal-origin': 'scout' },
    });

    expect(get2.data.id).toStrictEqual(backfillId2);
    expect(get2.data.start).toStrictEqual(start);
    expect(get2.data.end).toStrictEqual(end2);
    expect((get2.data as any).rule.id).toStrictEqual(ruleId2);
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Not found
  // ────────────────────────────────────────────────────────────────────────────
  test('returns 404 for a non-existent backfill ID', async ({ kbnClient }) => {
    const res = await kbnClient.request({
      method: 'GET',
      path: backfillGetPath('does-not-exist'),
      headers: { 'kbn-xsrf': 'scout', 'x-elastic-internal-origin': 'scout' },
      ignoreErrors: [404],
    });
    expect((res as any).status).toBe(404);
    expect((res.data as any).message).toContain('does-not-exist');
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Cross-space: backfill from default space is not visible via another space
  // ────────────────────────────────────────────────────────────────────────────
  test('returns 404 when getting a backfill from a different space', async ({
    apiServices,
    kbnClient,
  }) => {
    const OTHER_SPACE = {
      id: 'scout-backfill-get-other',
      name: 'BF Get Other',
      disabledFeatures: [],
    };
    await apiServices.spaces.create(OTHER_SPACE);

    try {
      const ruleRes = await kbnClient.request<{ id: string }>({
        method: 'POST',
        path: RULE_CREATE_PATH,
        headers: { 'kbn-xsrf': 'scout' },
        body: makeBackfillRule('scout-backfill-xspace'),
      });
      const ruleId = ruleRes.data.id;
      createdRuleIds.push(ruleId);

      const schedRes = await kbnClient.request<Array<{ id: string }>>({
        method: 'POST',
        path: BACKFILL_SCHEDULE_PATH,
        headers: { 'kbn-xsrf': 'scout', 'x-elastic-internal-origin': 'scout' },
        body: [{ rule_id: ruleId, ranges: [{ start, end: end1 }] }],
      });
      const backfillId = schedRes.data[0].id;
      createdBackfillIds.push(backfillId);

      // Attempt to get from the other space — should return 404
      const res = await kbnClient.request({
        method: 'GET',
        path: backfillGetPath(backfillId, OTHER_SPACE.id),
        headers: { 'kbn-xsrf': 'scout', 'x-elastic-internal-origin': 'scout' },
        ignoreErrors: [404],
      });
      expect((res as any).status).toBe(404);
    } finally {
      await apiServices.spaces.delete(OTHER_SPACE.id);
    }
  });

  // ────────────────────────────────────────────────────────────────────────────
  // RBAC: no privileges → 403
  // ────────────────────────────────────────────────────────────────────────────
  test('returns 403 for a user with no Kibana privileges', async ({
    browserAuth,
    kbnClient,
    kbnUrl,
    page,
  }) => {
    const ruleRes = await kbnClient.request<{ id: string }>({
      method: 'POST',
      path: RULE_CREATE_PATH,
      headers: { 'kbn-xsrf': 'scout' },
      body: makeBackfillRule('scout-backfill-get-rbac'),
    });
    const ruleId = ruleRes.data.id;
    createdRuleIds.push(ruleId);

    const schedRes = await kbnClient.request<Array<{ id: string }>>({
      method: 'POST',
      path: BACKFILL_SCHEDULE_PATH,
      headers: { 'kbn-xsrf': 'scout', 'x-elastic-internal-origin': 'scout' },
      body: [{ rule_id: ruleId, ranges: [{ start, end: end1 }] }],
    });
    const backfillId = schedRes.data[0].id;
    createdBackfillIds.push(backfillId);

    await browserAuth.loginWithCustomRole({
      elasticsearch: { cluster: [], indices: [] },
      kibana: [],
    });

    const response = await page.context().request.get(kbnUrl.get(backfillGetPath(backfillId)), {
      headers: { 'kbn-xsrf': 'scout', 'x-elastic-internal-origin': 'scout' },
    });

    expect(response.status()).toBe(403);
  });
});
