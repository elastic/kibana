/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Scout migration of:
 *   x-pack/platform/test/alerting_api_integration/security_and_spaces/group1/
 *   tests/alerting/backfill/public_api.ts
 *
 * Covers: happy-path schedule / get / find / delete via the public backfill
 * endpoints (/api/alerting/rules/backfill/...). Verifies that the public
 * routes are wired up and return the same data as the internal endpoints.
 *
 * Full edge-case and RBAC coverage lives in the individual
 * backfill_schedule / _get / _find / _delete spec files which exercise
 * the shared handler logic via the /internal/alerting/... paths.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test, makeBackfillRule } from '../fixtures';

const RULE_CREATE_PATH = '/api/alerting/rule';

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

test.describe('backfill public API', { tag: tags.stateful.classic }, () => {
  const createdRuleIds: string[] = [];
  const createdBackfillIds: string[] = [];

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
  // Happy path: schedule → get → find → delete via public routes
  // ────────────────────────────────────────────────────────────────────────────
  test('schedules, gets, finds, and deletes a backfill via the public API', async ({
    kbnClient,
  }) => {
    const start = daysAgoIso(7);
    const end = daysAgoIso(1);

    // Create a rule
    const ruleRes = await kbnClient.request<{ id: string }>({
      method: 'POST',
      path: RULE_CREATE_PATH,
      headers: { 'kbn-xsrf': 'scout' },
      body: makeBackfillRule('scout-backfill-public'),
    });
    const ruleId = ruleRes.data.id;
    createdRuleIds.push(ruleId);

    // --- Schedule via public API ---
    const schedRes = await kbnClient.request<Array<Record<string, unknown>>>({
      method: 'POST',
      path: '/api/alerting/rules/backfill/_schedule',
      headers: { 'kbn-xsrf': 'scout', 'x-elastic-internal-origin': 'scout' },
      body: [{ rule_id: ruleId, ranges: [{ start, end }] }],
    });

    expect(schedRes.data).toHaveLength(1);
    expect(typeof schedRes.data[0].id).toBe('string');

    const backfillId = schedRes.data[0].id as string;
    createdBackfillIds.push(backfillId);

    expect(schedRes.data[0].duration).toBe('12h');
    expect(schedRes.data[0].enabled).toBe(true);
    expect(schedRes.data[0].start).toStrictEqual(start);
    expect(schedRes.data[0].status).toBe('pending');
    expect((schedRes.data[0] as any).rule.id).toStrictEqual(ruleId);

    // --- Get via public API ---
    const getRes = await kbnClient.request<Record<string, unknown>>({
      method: 'GET',
      path: `/api/alerting/rules/backfill/${backfillId}`,
      headers: { 'kbn-xsrf': 'scout', 'x-elastic-internal-origin': 'scout' },
    });

    expect(getRes.data.id).toStrictEqual(backfillId);
    expect((getRes.data as any).rule.id).toStrictEqual(ruleId);
    expect(getRes.data.status).toBe('pending');

    // --- Find via public API ---
    const findRes = await kbnClient.request<{
      total: number;
      data: Array<Record<string, unknown>>;
    }>({
      method: 'POST',
      path: `/api/alerting/rules/backfill/_find?rule_ids=${ruleId}`,
      headers: { 'kbn-xsrf': 'scout', 'x-elastic-internal-origin': 'scout' },
    });

    expect(findRes.data.total).toBeGreaterThan(0);
    const found = findRes.data.data.find((b) => b.id === backfillId);
    expect(found).toBeDefined();
    expect((found as any).rule.id).toStrictEqual(ruleId);

    // --- Delete via public API ---
    const delRes = await kbnClient.request({
      method: 'DELETE',
      path: `/api/alerting/rules/backfill/${backfillId}`,
      headers: { 'kbn-xsrf': 'scout', 'x-elastic-internal-origin': 'scout' },
    });
    expect((delRes as any).status).toBe(204);

    // Remove from cleanup list — already deleted
    createdBackfillIds.splice(0);

    // Verify gone via public GET → 404
    const afterDel = await kbnClient.request({
      method: 'GET',
      path: `/api/alerting/rules/backfill/${backfillId}`,
      headers: { 'kbn-xsrf': 'scout', 'x-elastic-internal-origin': 'scout' },
      ignoreErrors: [404],
    });
    expect((afterDel as any).status).toBe(404);
  });
});
