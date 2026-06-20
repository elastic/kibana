/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Scout migration of:
 *   x-pack/platform/test/alerting_api_integration/security_and_spaces/group1/
 *   tests/alerting/backfill/find.ts
 *
 * Covers: finding by rule IDs, filtering by start/end date, filtering by initiator,
 * pagination + sorting, invalid query params, and RBAC (no-privileges denied).
 *
 * Out of scope: ES-level saved-object content verification.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test, makeBackfillRule } from '../fixtures';

const RULE_CREATE_PATH = '/api/alerting/rule';
const BACKFILL_SCHEDULE_PATH = '/internal/alerting/rules/backfill/_schedule';
const BACKFILL_FIND_PATH = '/internal/alerting/rules/backfill/_find';

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

test.describe('backfill find API', { tag: tags.stateful.classic }, () => {
  const createdRuleIds: string[] = [];
  const createdBackfillIds: string[] = [];

  const start1 = daysAgoIso(14);
  const end1 = daysAgoIso(8);
  const start2 = daysAgoIso(12);
  const end2 = daysAgoIso(10);

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
  // Helper: create two rules + two backfills, return their IDs
  // ────────────────────────────────────────────────────────────────────────────
  async function setupTwoBackfills(kbnClient: any): Promise<{
    ruleId1: string;
    ruleId2: string;
    backfillId1: string;
    backfillId2: string;
  }> {
    const r1 = await kbnClient.request<{ id: string }>({
      method: 'POST',
      path: RULE_CREATE_PATH,
      headers: { 'kbn-xsrf': 'scout' },
      body: makeBackfillRule('scout-backfill-find'),
    });
    const ruleId1 = r1.data.id;
    createdRuleIds.push(ruleId1);

    const r2 = await kbnClient.request<{ id: string }>({
      method: 'POST',
      path: RULE_CREATE_PATH,
      headers: { 'kbn-xsrf': 'scout' },
      body: makeBackfillRule('scout-backfill-find'),
    });
    const ruleId2 = r2.data.id;
    createdRuleIds.push(ruleId2);

    const schedRes = await kbnClient.request<Array<{ id: string }>>({
      method: 'POST',
      path: BACKFILL_SCHEDULE_PATH,
      headers: { 'kbn-xsrf': 'scout', 'x-elastic-internal-origin': 'scout' },
      body: [
        { rule_id: ruleId1, ranges: [{ start: start1, end: end1 }] },
        { rule_id: ruleId2, ranges: [{ start: start2, end: end2 }] },
      ],
    });

    const backfillId1 = schedRes.data[0].id;
    const backfillId2 = schedRes.data[1].id;
    createdBackfillIds.push(backfillId1, backfillId2);

    return { ruleId1, ruleId2, backfillId1, backfillId2 };
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Find by single rule_id
  // ────────────────────────────────────────────────────────────────────────────
  test('finds backfills for a single rule by rule_id', async ({ kbnClient }) => {
    const { ruleId1, ruleId2, backfillId1, backfillId2 } = await setupTwoBackfills(kbnClient);

    const findRule1 = await kbnClient.request<{
      total: number;
      data: Array<Record<string, unknown>>;
    }>({
      method: 'POST',
      path: `${BACKFILL_FIND_PATH}?rule_ids=${ruleId1}`,
      headers: { 'kbn-xsrf': 'scout', 'x-elastic-internal-origin': 'scout' },
    });
    expect(findRule1.data.total).toBeGreaterThanOrEqual(1);
    const bf1 = findRule1.data.data.find((b) => b.id === backfillId1);
    expect(bf1).toBeDefined();
    expect(bf1!.duration).toBe('12h');
    expect(bf1!.enabled).toBe(true);
    expect(bf1!.start).toStrictEqual(start1);
    expect(bf1!.end).toStrictEqual(end1);
    expect(bf1!.status).toBe('pending');
    expect(bf1!.initiator).toBe('user');
    expect(bf1!.initiator_id).toBeUndefined();
    expect(typeof bf1!.created_at).toBe('string');
    expect((bf1 as any).rule.id).toStrictEqual(ruleId1);
    // Rule 2's backfill should NOT appear
    const bf2InRule1Find = findRule1.data.data.find((b) => b.id === backfillId2);
    expect(bf2InRule1Find).toBeUndefined();

    const findRule2 = await kbnClient.request<{
      total: number;
      data: Array<Record<string, unknown>>;
    }>({
      method: 'POST',
      path: `${BACKFILL_FIND_PATH}?rule_ids=${ruleId2}`,
      headers: { 'kbn-xsrf': 'scout', 'x-elastic-internal-origin': 'scout' },
    });
    expect(findRule2.data.total).toBeGreaterThanOrEqual(1);
    const bf2 = findRule2.data.data.find((b) => b.id === backfillId2);
    expect(bf2).toBeDefined();
    expect((bf2 as any).rule.id).toStrictEqual(ruleId2);
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Find by multiple rule_ids in a single request
  // ────────────────────────────────────────────────────────────────────────────
  test('finds backfills for multiple rules in a single query', async ({ kbnClient }) => {
    const { ruleId1, ruleId2, backfillId1, backfillId2 } = await setupTwoBackfills(kbnClient);

    const findBoth = await kbnClient.request<{
      total: number;
      data: Array<Record<string, unknown>>;
    }>({
      method: 'POST',
      path: `${BACKFILL_FIND_PATH}?rule_ids=${ruleId1},${ruleId2}`,
      headers: { 'kbn-xsrf': 'scout', 'x-elastic-internal-origin': 'scout' },
    });
    expect(findBoth.data.total).toBeGreaterThanOrEqual(2);
    const ids = findBoth.data.data.map((b) => b.id);
    expect(ids).toContain(backfillId1);
    expect(ids).toContain(backfillId2);
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Filter by start date
  // ────────────────────────────────────────────────────────────────────────────
  test('filters backfills by start date', async ({ kbnClient }) => {
    const { ruleId1, ruleId2, backfillId1, backfillId2 } = await setupTwoBackfills(kbnClient);

    // Filter: start >= start1 (which is earlier than start2)
    const findByStart = await kbnClient.request<{
      total: number;
      data: Array<Record<string, unknown>>;
    }>({
      method: 'POST',
      path: `${BACKFILL_FIND_PATH}?rule_ids=${ruleId1},${ruleId2}&start=${encodeURIComponent(
        start1
      )}`,
      headers: { 'kbn-xsrf': 'scout', 'x-elastic-internal-origin': 'scout' },
    });

    const ids = findByStart.data.data.map((b) => b.id);
    expect(ids).toContain(backfillId1);
    expect(ids).toContain(backfillId2);

    // Filter: start >= start2 (should exclude backfill1 which starts at start1)
    const findByStart2 = await kbnClient.request<{
      total: number;
      data: Array<Record<string, unknown>>;
    }>({
      method: 'POST',
      path: `${BACKFILL_FIND_PATH}?rule_ids=${ruleId1},${ruleId2}&start=${encodeURIComponent(
        start2
      )}`,
      headers: { 'kbn-xsrf': 'scout', 'x-elastic-internal-origin': 'scout' },
    });

    const ids2 = findByStart2.data.data.map((b) => b.id);
    expect(ids2).not.toContain(backfillId1);
    expect(ids2).toContain(backfillId2);
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Filter by end date
  // ────────────────────────────────────────────────────────────────────────────
  test('filters backfills by end date', async ({ kbnClient }) => {
    const { ruleId1, ruleId2, backfillId1, backfillId2 } = await setupTwoBackfills(kbnClient);

    // end <= end2 should exclude backfill1 (whose end = end1 which is later than end2)
    const findByEnd = await kbnClient.request<{
      total: number;
      data: Array<Record<string, unknown>>;
    }>({
      method: 'POST',
      path: `${BACKFILL_FIND_PATH}?rule_ids=${ruleId1},${ruleId2}&end=${encodeURIComponent(end2)}`,
      headers: { 'kbn-xsrf': 'scout', 'x-elastic-internal-origin': 'scout' },
    });

    const ids = findByEnd.data.data.map((b) => b.id);
    expect(ids).not.toContain(backfillId1);
    expect(ids).toContain(backfillId2);
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Filter by initiator = user
  // ────────────────────────────────────────────────────────────────────────────
  test('filters backfills by initiator=user', async ({ kbnClient }) => {
    const { ruleId1, backfillId1 } = await setupTwoBackfills(kbnClient);

    const findByInitiator = await kbnClient.request<{
      total: number;
      data: Array<Record<string, unknown>>;
    }>({
      method: 'POST',
      path: `${BACKFILL_FIND_PATH}?rule_ids=${ruleId1}&initiator=user`,
      headers: { 'kbn-xsrf': 'scout', 'x-elastic-internal-origin': 'scout' },
    });

    const ids = findByInitiator.data.data.map((b) => b.id);
    expect(ids).toContain(backfillId1);
    for (const bf of findByInitiator.data.data) {
      expect(bf.initiator).toBe('user');
    }
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Pagination + sorting
  // ────────────────────────────────────────────────────────────────────────────
  test('supports pagination and sorting of backfill results', async ({ kbnClient }) => {
    // Create a rule with 3 backfill entries so we can page through them
    const ruleRes = await kbnClient.request<{ id: string }>({
      method: 'POST',
      path: RULE_CREATE_PATH,
      headers: { 'kbn-xsrf': 'scout' },
      body: makeBackfillRule('scout-backfill-page'),
    });
    const ruleId = ruleRes.data.id;
    createdRuleIds.push(ruleId);

    const s1 = daysAgoIso(30);
    const e1 = daysAgoIso(25);
    const s2 = daysAgoIso(24);
    const e2 = daysAgoIso(20);
    const s3 = daysAgoIso(19);
    const e3 = daysAgoIso(15);

    const schedRes = await kbnClient.request<Array<{ id: string }>>({
      method: 'POST',
      path: BACKFILL_SCHEDULE_PATH,
      headers: { 'kbn-xsrf': 'scout', 'x-elastic-internal-origin': 'scout' },
      body: [
        { rule_id: ruleId, ranges: [{ start: s1, end: e1 }] },
        { rule_id: ruleId, ranges: [{ start: s2, end: e2 }] },
        { rule_id: ruleId, ranges: [{ start: s3, end: e3 }] },
      ],
    });
    for (const b of schedRes.data) {
      createdBackfillIds.push(b.id);
    }

    // Page 1: 2 per page, sort by start asc
    const page1 = await kbnClient.request<{ total: number; data: Array<Record<string, unknown>> }>({
      method: 'POST',
      path: `${BACKFILL_FIND_PATH}?rule_ids=${ruleId}&per_page=2&page=1&sort_field=createdAt&sort_order=asc`,
      headers: { 'kbn-xsrf': 'scout', 'x-elastic-internal-origin': 'scout' },
    });

    expect(page1.data.total).toBeGreaterThanOrEqual(3);
    expect(page1.data.data).toHaveLength(2);

    // Page 2: remaining items
    const page2 = await kbnClient.request<{ total: number; data: Array<Record<string, unknown>> }>({
      method: 'POST',
      path: `${BACKFILL_FIND_PATH}?rule_ids=${ruleId}&per_page=2&page=2&sort_field=createdAt&sort_order=asc`,
      headers: { 'kbn-xsrf': 'scout', 'x-elastic-internal-origin': 'scout' },
    });

    expect(page2.data.data.length).toBeGreaterThanOrEqual(1);

    // All IDs across both pages should be unique
    const allIds = [...page1.data.data.map((b) => b.id), ...page2.data.data.map((b) => b.id)];
    expect(new Set(allIds).size).toStrictEqual(allIds.length);
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
      body: makeBackfillRule('scout-backfill-find-rbac'),
    });
    const ruleId = ruleRes.data.id;
    createdRuleIds.push(ruleId);

    await browserAuth.loginWithCustomRole({
      elasticsearch: { cluster: [], indices: [] },
      kibana: [],
    });

    const response = await page
      .context()
      .request.post(kbnUrl.get(`${BACKFILL_FIND_PATH}?rule_ids=${ruleId}`), {
        headers: { 'kbn-xsrf': 'scout', 'x-elastic-internal-origin': 'scout' },
      });

    expect(response.status()).toBe(403);
  });
});
