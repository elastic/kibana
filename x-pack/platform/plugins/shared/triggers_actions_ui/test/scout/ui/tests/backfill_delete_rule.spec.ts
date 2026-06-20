/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Scout migration of:
 *   x-pack/platform/test/alerting_api_integration/security_and_spaces/group1/
 *   tests/alerting/backfill/delete_rule.ts
 *
 * Covers: cascade deletion — when the originating rules are deleted, all
 * associated backfills become inaccessible (GET → 404).
 *
 * Out of scope: ES saved-object and task-manager index verification.
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

test.describe(
  'backfill cascade delete when rule is deleted',
  { tag: tags.stateful.classic },
  () => {
    // ────────────────────────────────────────────────────────────────────────────
    // Cascade: deleting the originating rules removes all their backfills
    // ────────────────────────────────────────────────────────────────────────────
    test('deletes associated backfills when their originating rules are deleted', async ({
      kbnClient,
    }) => {
      const start1 = daysAgoIso(20);
      const end1 = daysAgoIso(1);
      const start2 = daysAgoIso(40);
      const end2 = daysAgoIso(22);

      // Create 2 rules
      const r1 = await kbnClient.request<{ id: string }>({
        method: 'POST',
        path: RULE_CREATE_PATH,
        headers: { 'kbn-xsrf': 'scout' },
        body: makeBackfillRule('scout-backfill-delrule'),
      });
      const ruleId1 = r1.data.id;

      const r2 = await kbnClient.request<{ id: string }>({
        method: 'POST',
        path: RULE_CREATE_PATH,
        headers: { 'kbn-xsrf': 'scout' },
        body: makeBackfillRule('scout-backfill-delrule'),
      });
      const ruleId2 = r2.data.id;

      // Schedule 3 backfills: 2 for rule1, 1 for rule2
      const schedRes = await kbnClient.request<Array<{ id: string }>>({
        method: 'POST',
        path: BACKFILL_SCHEDULE_PATH,
        headers: { 'kbn-xsrf': 'scout', 'x-elastic-internal-origin': 'scout' },
        body: [
          { rule_id: ruleId1, ranges: [{ start: start1, end: end1 }] },
          { rule_id: ruleId1, ranges: [{ start: start2, end: end2 }] },
          { rule_id: ruleId2, ranges: [{ start: start1, end: end1 }] },
        ],
      });
      expect(schedRes.data).toHaveLength(3);

      const backfillId1 = schedRes.data[0].id;
      const backfillId2 = schedRes.data[1].id;
      const backfillId3 = schedRes.data[2].id;

      // Verify all 3 backfills exist before rule deletion
      for (const id of [backfillId1, backfillId2, backfillId3]) {
        const getRes = await kbnClient.request({
          method: 'GET',
          path: `/internal/alerting/rules/backfill/${id}`,
          headers: { 'kbn-xsrf': 'scout', 'x-elastic-internal-origin': 'scout' },
        });
        expect((getRes as any).status).toBe(200);
      }

      // Delete both rules — this should cascade-delete their backfills
      await kbnClient.request({
        method: 'DELETE',
        path: `/api/alerting/rule/${ruleId1}`,
        headers: { 'kbn-xsrf': 'scout' },
      });
      await kbnClient.request({
        method: 'DELETE',
        path: `/api/alerting/rule/${ruleId2}`,
        headers: { 'kbn-xsrf': 'scout' },
      });

      // Verify all 3 backfills are now gone
      for (const id of [backfillId1, backfillId2, backfillId3]) {
        const getRes = await kbnClient.request({
          method: 'GET',
          path: `/internal/alerting/rules/backfill/${id}`,
          headers: { 'kbn-xsrf': 'scout', 'x-elastic-internal-origin': 'scout' },
          ignoreErrors: [404],
        });
        expect((getRes as any).status).toBe(404);
      }
    });
  }
);
