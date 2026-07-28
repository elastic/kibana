/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Scout migration of:
 *   x-pack/platform/test/alerting_api_integration/security_and_spaces/group1/
 *   tests/alerting/backfill/delete.ts
 *
 * Covers: happy-path delete of two backfills, 404 for non-existent ID,
 * cross-space delete returns 404 (original backfill survives),
 * and RBAC (no-privileges and read-only users are denied).
 *
 * Out of scope: ES task-manager index verification.
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

test.describe('backfill delete API', { tag: tags.stateful.classic }, () => {
  const createdRuleIds: string[] = [];
  const createdBackfillIds: string[] = [];

  const start = daysAgoIso(31);
  const end = daysAgoIso(1);

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
  // Happy path: delete two backfills, verify they are gone
  // ────────────────────────────────────────────────────────────────────────────
  test('deletes backfills and verifies they are no longer accessible', async ({ kbnClient }) => {
    const r1 = await kbnClient.request<{ id: string }>({
      method: 'POST',
      path: RULE_CREATE_PATH,
      headers: { 'kbn-xsrf': 'scout' },
      body: makeBackfillRule('scout-backfill-del'),
    });
    const ruleId1 = r1.data.id;
    createdRuleIds.push(ruleId1);

    const r2 = await kbnClient.request<{ id: string }>({
      method: 'POST',
      path: RULE_CREATE_PATH,
      headers: { 'kbn-xsrf': 'scout' },
      body: makeBackfillRule('scout-backfill-del'),
    });
    const ruleId2 = r2.data.id;
    createdRuleIds.push(ruleId2);

    const schedRes = await kbnClient.request<Array<{ id: string }>>({
      method: 'POST',
      path: BACKFILL_SCHEDULE_PATH,
      headers: { 'kbn-xsrf': 'scout', 'x-elastic-internal-origin': 'scout' },
      body: [
        { rule_id: ruleId1, ranges: [{ start, end }] },
        { rule_id: ruleId2, ranges: [{ start, end }] },
      ],
    });
    const backfillId1 = schedRes.data[0].id;
    const backfillId2 = schedRes.data[1].id;
    // Track for cleanup but only if delete tests fail
    createdBackfillIds.push(backfillId1, backfillId2);

    // Verify both exist
    const get1 = await kbnClient.request({
      method: 'GET',
      path: `/internal/alerting/rules/backfill/${backfillId1}`,
      headers: { 'kbn-xsrf': 'scout', 'x-elastic-internal-origin': 'scout' },
    });
    expect((get1 as any).status).toBe(200);

    const get2 = await kbnClient.request({
      method: 'GET',
      path: `/internal/alerting/rules/backfill/${backfillId2}`,
      headers: { 'kbn-xsrf': 'scout', 'x-elastic-internal-origin': 'scout' },
    });
    expect((get2 as any).status).toBe(200);

    // Delete both
    const del1 = await kbnClient.request({
      method: 'DELETE',
      path: `/internal/alerting/rules/backfill/${backfillId1}`,
      headers: { 'kbn-xsrf': 'scout', 'x-elastic-internal-origin': 'scout' },
      ignoreErrors: [404],
    });
    expect((del1 as any).status).toBe(204);

    const del2 = await kbnClient.request({
      method: 'DELETE',
      path: `/internal/alerting/rules/backfill/${backfillId2}`,
      headers: { 'kbn-xsrf': 'scout', 'x-elastic-internal-origin': 'scout' },
      ignoreErrors: [404],
    });
    expect((del2 as any).status).toBe(204);

    // Remove from cleanup list since they are already deleted
    createdBackfillIds.splice(0);

    // Verify both are gone
    const afterDel1 = await kbnClient.request({
      method: 'GET',
      path: `/internal/alerting/rules/backfill/${backfillId1}`,
      headers: { 'kbn-xsrf': 'scout', 'x-elastic-internal-origin': 'scout' },
      ignoreErrors: [404],
    });
    expect((afterDel1 as any).status).toBe(404);

    const afterDel2 = await kbnClient.request({
      method: 'GET',
      path: `/internal/alerting/rules/backfill/${backfillId2}`,
      headers: { 'kbn-xsrf': 'scout', 'x-elastic-internal-origin': 'scout' },
      ignoreErrors: [404],
    });
    expect((afterDel2 as any).status).toBe(404);
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Not found: delete non-existent backfill → 404 with descriptive message
  // ────────────────────────────────────────────────────────────────────────────
  test('returns 404 when deleting a non-existent backfill ID', async ({ kbnClient }) => {
    const res = await kbnClient.request({
      method: 'DELETE',
      path: '/internal/alerting/rules/backfill/does-not-exist',
      headers: { 'kbn-xsrf': 'scout', 'x-elastic-internal-origin': 'scout' },
      ignoreErrors: [404],
    });
    expect((res as any).status).toBe(404);
    expect((res.data as any).message).toContain('does-not-exist');
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Cross-space: delete from wrong space → 404, original backfill survives
  // ────────────────────────────────────────────────────────────────────────────
  test('returns 404 when deleting a backfill from a different space', async ({
    apiServices,
    kbnClient,
  }) => {
    const OTHER_SPACE = {
      id: 'scout-backfill-del-other',
      name: 'BF Del Other',
      disabledFeatures: [],
    };
    await apiServices.spaces.create(OTHER_SPACE);

    try {
      const ruleRes = await kbnClient.request<{ id: string }>({
        method: 'POST',
        path: RULE_CREATE_PATH,
        headers: { 'kbn-xsrf': 'scout' },
        body: makeBackfillRule('scout-backfill-del-xspace'),
      });
      const ruleId = ruleRes.data.id;
      createdRuleIds.push(ruleId);

      const schedRes = await kbnClient.request<Array<{ id: string }>>({
        method: 'POST',
        path: BACKFILL_SCHEDULE_PATH,
        headers: { 'kbn-xsrf': 'scout', 'x-elastic-internal-origin': 'scout' },
        body: [{ rule_id: ruleId, ranges: [{ start, end }] }],
      });
      const backfillId = schedRes.data[0].id;
      createdBackfillIds.push(backfillId);

      // Attempt delete from other space → 404
      const delRes = await kbnClient.request({
        method: 'DELETE',
        path: `/s/${OTHER_SPACE.id}/internal/alerting/rules/backfill/${backfillId}`,
        headers: { 'kbn-xsrf': 'scout', 'x-elastic-internal-origin': 'scout' },
        ignoreErrors: [404],
      });
      expect((delRes as any).status).toBe(404);

      // Backfill should still exist in default space
      const getRes = await kbnClient.request({
        method: 'GET',
        path: `/internal/alerting/rules/backfill/${backfillId}`,
        headers: { 'kbn-xsrf': 'scout', 'x-elastic-internal-origin': 'scout' },
      });
      expect((getRes as any).status).toBe(200);
    } finally {
      await apiServices.spaces.delete(OTHER_SPACE.id);
    }
  });

  // ────────────────────────────────────────────────────────────────────────────
  // RBAC: no privileges → 403
  // ────────────────────────────────────────────────────────────────────────────
  test('returns 403 when a no-privileges user attempts to delete a backfill', async ({
    browserAuth,
    kbnClient,
    kbnUrl,
    page,
  }) => {
    const ruleRes = await kbnClient.request<{ id: string }>({
      method: 'POST',
      path: RULE_CREATE_PATH,
      headers: { 'kbn-xsrf': 'scout' },
      body: makeBackfillRule('scout-backfill-del-rbac'),
    });
    const ruleId = ruleRes.data.id;
    createdRuleIds.push(ruleId);

    const schedRes = await kbnClient.request<Array<{ id: string }>>({
      method: 'POST',
      path: BACKFILL_SCHEDULE_PATH,
      headers: { 'kbn-xsrf': 'scout', 'x-elastic-internal-origin': 'scout' },
      body: [{ rule_id: ruleId, ranges: [{ start, end }] }],
    });
    const backfillId = schedRes.data[0].id;
    createdBackfillIds.push(backfillId);

    await browserAuth.loginWithCustomRole({
      elasticsearch: { cluster: [], indices: [] },
      kibana: [],
    });

    const response = await page
      .context()
      .request.delete(kbnUrl.get(`/internal/alerting/rules/backfill/${backfillId}`), {
        headers: { 'kbn-xsrf': 'scout', 'x-elastic-internal-origin': 'scout' },
      });

    expect(response.status()).toBe(403);
  });

  // ────────────────────────────────────────────────────────────────────────────
  // RBAC: read-only user → 403
  // ────────────────────────────────────────────────────────────────────────────
  test('returns 403 when a read-only user attempts to delete a backfill', async ({
    browserAuth,
    kbnClient,
    kbnUrl,
    page,
  }) => {
    const ruleRes = await kbnClient.request<{ id: string }>({
      method: 'POST',
      path: RULE_CREATE_PATH,
      headers: { 'kbn-xsrf': 'scout' },
      body: makeBackfillRule('scout-backfill-del-readonly'),
    });
    const ruleId = ruleRes.data.id;
    createdRuleIds.push(ruleId);

    const schedRes = await kbnClient.request<Array<{ id: string }>>({
      method: 'POST',
      path: BACKFILL_SCHEDULE_PATH,
      headers: { 'kbn-xsrf': 'scout', 'x-elastic-internal-origin': 'scout' },
      body: [{ rule_id: ruleId, ranges: [{ start, end }] }],
    });
    const backfillId = schedRes.data[0].id;
    createdBackfillIds.push(backfillId);

    await browserAuth.loginWithCustomRole({
      elasticsearch: { cluster: [], indices: [] },
      kibana: [
        {
          base: [],
          feature: { siem: ['read'] },
          spaces: ['*'],
        },
      ],
    });

    const response = await page
      .context()
      .request.delete(kbnUrl.get(`/internal/alerting/rules/backfill/${backfillId}`), {
        headers: { 'kbn-xsrf': 'scout', 'x-elastic-internal-origin': 'scout' },
      });

    expect(response.status()).toBe(403);
  });
});
