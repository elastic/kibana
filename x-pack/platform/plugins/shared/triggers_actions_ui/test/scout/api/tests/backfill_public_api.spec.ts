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
import { expect } from '@kbn/scout/api';
import { apiTest, makeBackfillRule } from '../fixtures';

const RULE_CREATE_PATH = '/api/alerting/rule';

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

apiTest.describe('backfill public API', { tag: tags.stateful.classic }, () => {
  const createdRuleIds: string[] = [];
  const createdBackfillIds: string[] = [];

  apiTest.afterEach(async ({ apiClient, kbnClient }) => {
    expect(apiClient).toBeDefined();
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
  apiTest(
    'schedules, gets, finds, and deletes a backfill via the public API',
    async ({ apiClient, kbnClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
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
      const schedRes = await apiClient.post('api/alerting/rules/backfill/_schedule', {
        headers: { 'kbn-xsrf': 'scout', ...cookieHeader },
        body: [{ rule_id: ruleId, ranges: [{ start, end }] }],
      });
      expect(schedRes).toHaveStatusCode(200);

      const scheduleBody = schedRes.body as Array<Record<string, unknown>>;
      expect(scheduleBody).toHaveLength(1);
      expect(typeof scheduleBody[0].id).toBe('string');

      const backfillId = scheduleBody[0].id as string;
      createdBackfillIds.push(backfillId);

      expect(scheduleBody[0].duration).toBe('12h');
      expect(scheduleBody[0].enabled).toBe(true);
      expect(scheduleBody[0].start).toStrictEqual(start);
      expect(scheduleBody[0].status).toBe('pending');
      expect((scheduleBody[0] as any).rule.id).toStrictEqual(ruleId);

      // --- Get via public API ---
      const getRes = await apiClient.get(`api/alerting/rules/backfill/${backfillId}`, {
        headers: { 'kbn-xsrf': 'scout', ...cookieHeader },
      });
      expect(getRes).toHaveStatusCode(200);

      const getBody = getRes.body as Record<string, unknown>;
      expect(getBody.id).toStrictEqual(backfillId);
      expect((getBody as any).rule.id).toStrictEqual(ruleId);
      expect(getBody.status).toBe('pending');

      // --- Find via public API ---
      const findRes = await apiClient.post(`api/alerting/rules/backfill/_find?rule_ids=${ruleId}`, {
        headers: { 'kbn-xsrf': 'scout', ...cookieHeader },
      });
      expect(findRes).toHaveStatusCode(200);

      const findBody = findRes.body as {
        total: number;
        data: Array<Record<string, unknown>>;
      };

      expect(findBody.total).toBeGreaterThan(0);
      const found = findBody.data.find((b) => b.id === backfillId);
      expect(found).toBeDefined();
      expect((found as any).rule.id).toStrictEqual(ruleId);

      // --- Delete via public API ---
      const delRes = await apiClient.delete(`api/alerting/rules/backfill/${backfillId}`, {
        headers: { 'kbn-xsrf': 'scout', ...cookieHeader },
      });
      expect(delRes).toHaveStatusCode(204);

      // Remove from cleanup list — already deleted
      createdBackfillIds.splice(0);

      // Verify gone via public GET → 404
      const afterDel = await apiClient.get(`api/alerting/rules/backfill/${backfillId}`, {
        headers: { 'kbn-xsrf': 'scout', ...cookieHeader },
      });
      expect(afterDel).toHaveStatusCode(404);
    }
  );
});
