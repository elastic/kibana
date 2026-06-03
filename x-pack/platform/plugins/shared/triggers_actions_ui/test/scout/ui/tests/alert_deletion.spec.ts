/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

// Migrated from: x-pack/platform/test/functional_with_es_ssl/apps/triggers_actions_ui/alert_deletion.ts
// Full cross-category coverage (stack, o11y, security) matching the FTR original.
// Document builders are inlined because alert_deletion_test_utils.ts lives outside
// this Scout tsconfig's module resolution scope.
// IDs are taken verbatim from the `default` space column of alert_deletion_test_utils.ts
// so this spec and the API-integration tests share stable fixture IDs.
//
// Data layout (default space):
//   Stack:    4 active-old + 3 inactive-old → deleted  |  1 active-new  + 2 inactive-new → survive
//   O11y:     1 active-old + 2 inactive-old → deleted  |  4 active-new  + 3 inactive-new → survive
//   Security: 3 active-old + 5 inactive-old → deleted  |  6 active-new  + 1 inactive-new → survive
//
//   Total deleted: 18  |  Total surviving: 17

const ALERTS_INDEX_PATTERN = '.internal.alerts-*';
const EVENT_LOG_INDEX = '.kibana-event-log*';

// ── Timestamps ────────────────────────────────────────────────────────────────

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();

// "Old" = definitely > 90 days; "new" = definitely < 90 days.
const OLD_TS = daysAgo(100);
const NEW_TS = daysAgo(10);

// ── Category metadata ─────────────────────────────────────────────────────────

const CAT = {
  stack: {
    index: '.internal.alerts-stack.alerts-default-000001',
    ruleCategory: 'Elasticsearch query',
    ruleConsumer: 'stackAlerts',
    ruleTypeId: '.es-query',
  },
  o11y: {
    index: '.internal.alerts-observability.threshold.alerts-default-000001',
    ruleCategory: 'Custom threshold',
    ruleConsumer: 'logs',
    ruleTypeId: 'observability.rules.custom_threshold',
  },
  security: {
    index: '.internal.alerts-security.alerts-default-000001',
    ruleCategory: 'Custom Query Rule',
    ruleConsumer: 'siem',
    ruleTypeId: 'siem.queryRule',
  },
} as const;

type Category = (typeof CAT)[keyof typeof CAT];

// ── Document builders ─────────────────────────────────────────────────────────

const baseFields = (cat: Category) => ({
  'kibana.alert.rule.execution.uuid': 'scout-exec-uuid',
  'kibana.alert.rule.name': 'scout-test-rule',
  'kibana.alert.rule.parameters': {},
  'kibana.alert.rule.producer': 'stackAlerts',
  'kibana.alert.rule.revision': 0,
  'kibana.alert.rule.tags': [],
  'kibana.alert.rule.uuid': 'scout-rule-uuid',
  'kibana.alert.rule.category': cat.ruleCategory,
  'kibana.alert.rule.consumer': cat.ruleConsumer,
  'kibana.alert.rule.rule_type_id': cat.ruleTypeId,
  'kibana.space_ids': ['default'],
  'event.kind': 'signal',
  'kibana.alert.flapping': false,
  'kibana.alert.flapping_history': [],
  'kibana.alert.instance.id': 'query matched',
  'kibana.alert.maintenance_window_ids': [],
  'kibana.alert.consecutive_matches': 1,
  'kibana.alert.pending_recovered_count': 0,
  'kibana.version': '9.1.0',
  tags: [],
});

// Active lifecycle alert (stack, o11y, security active).
// kibana.alert.start drives the deletion-task age check for active alerts.
const makeActive = (id: string, cat: Category, startTs: string) => ({
  ...baseFields(cat),
  '@timestamp': startTs,
  'kibana.alert.rule.execution.timestamp': startTs,
  'kibana.alert.start': startTs,
  'kibana.alert.time_range': { gte: startTs },
  'event.action': 'active',
  'kibana.alert.status': 'active',
  'kibana.alert.action_group': 'query matched',
  'kibana.alert.uuid': id,
  'kibana.alert.workflow_status': 'open',
  'kibana.alert.duration.us': 0,
  'kibana.alert.reason': 'scout test active alert',
  'kibana.alert.title': 'scout test active',
});

// Recovered/inactive lifecycle alert (stack, o11y).
// @timestamp / kibana.alert.end = endTs; kibana.alert.start = endTs − 10 h.
const makeRecovered = (id: string, cat: Category, endTs: string) => {
  const startTs = new Date(Date.parse(endTs) - 10 * 60 * 60 * 1000).toISOString();
  return {
    ...baseFields(cat),
    '@timestamp': endTs,
    'kibana.alert.rule.execution.timestamp': endTs,
    'kibana.alert.start': startTs,
    'kibana.alert.end': endTs,
    'kibana.alert.time_range': { gte: startTs, lte: endTs },
    'event.action': 'close',
    'kibana.alert.status': 'recovered',
    'kibana.alert.action_group': 'recovered',
    'kibana.alert.uuid': id,
    'kibana.alert.workflow_status': 'open',
    'kibana.alert.duration.us': 36_000_000_000,
    'kibana.alert.reason': 'scout test recovered alert',
    'kibana.alert.title': 'scout test recovered',
  };
};

// Security detection-style inactive alert: status='active' + workflow_status='closed'.
// Detection alerts do not use kibana.alert.end; the task ages them via kibana.alert.start.
const makeSecurityInactive = (id: string, closedTs: string) => {
  const cat = CAT.security;
  const startTs = new Date(Date.parse(closedTs) - 10 * 60 * 60 * 1000).toISOString();
  return {
    ...baseFields(cat),
    '@timestamp': closedTs,
    'kibana.alert.rule.execution.timestamp': closedTs,
    'kibana.alert.start': startTs,
    'kibana.alert.workflow_status_updated_at': closedTs,
    'event.action': 'active',
    'kibana.alert.status': 'active',
    'kibana.alert.action_group': 'query matched',
    'kibana.alert.uuid': id,
    'kibana.alert.workflow_status': 'closed',
    'kibana.alert.duration.us': 0,
    'kibana.alert.reason': 'scout test security inactive alert',
    'kibana.alert.title': 'scout test security inactive',
  };
};

// ── Test IDs ──────────────────────────────────────────────────────────────────
// From the `default` space column in alert_deletion_test_utils.ts.

// Stack — 4 active-old, 1 active-new, 3 inactive-old, 2 inactive-new
const STACK_ACTIVE_OLD = [
  'da00d551-c318-4f58-b618-11f9781ec61e',
  '58fc1f4d-f949-4f51-b838-a72bef44656c',
  '3711cf80-8f8b-4575-b21d-2c9f4fd4f9ef',
  '581d0d3d-303a-4909-b631-62c97dea0473',
];
const STACK_ACTIVE_NEW = ['f10fb95f-7e4f-4d2d-a84a-96d5f9076298'];
const STACK_INACTIVE_OLD = [
  '5760aff4-da99-4403-a26b-bd21889c1e73',
  '8f375775-3dac-4da1-8e63-e03b89566d9d',
  'bd72c41c-a904-4a29-a8fc-27026acb9496',
];
const STACK_INACTIVE_NEW = [
  '44b33c3f-cb45-4397-bf70-6fe487d99b5c',
  '448bfa8a-360b-4c6e-a71d-4d491b182ad2',
];

// O11y — 1 active-old, 4 active-new, 2 inactive-old, 3 inactive-new
const O11Y_ACTIVE_OLD = ['cdad1860-5ffd-4d41-8518-f7f3c237b2c9'];
const O11Y_ACTIVE_NEW = [
  'f5d1c3fb-de14-46db-9c55-ff660d4ca81e',
  'ec7e005a-d69f-4ca0-a480-006bcb47d1c4',
  'ad987d9f-9714-4b73-a383-10a7c7761051',
  '9a6a0a3a-206a-4aa4-9ebe-ed0c52f4585e',
];
const O11Y_INACTIVE_OLD = [
  '034115eb-9edc-47be-b717-817346f1f108',
  '2b71e992-f67a-409d-b5f2-e9b7a312e681',
];
const O11Y_INACTIVE_NEW = [
  '48e93b15-a59e-4b5a-94f4-739d85b29e6c',
  'c533d7d8-ae2d-4401-a8dd-43fe30543b13',
  'fe1e22d2-3ba3-4c85-9ca3-3df869b80d46',
];

// Security — 3 active-old, 6 active-new, 5 inactive-old, 1 inactive-new
const SEC_ACTIVE_OLD = [
  'e60b7216-1984-4884-b632-07232388ec8e',
  '118b6910-ee68-4391-867a-f7fc260c03f3',
  'fb5a0046-fb69-460a-839a-3aa614f2259b',
];
const SEC_ACTIVE_NEW = [
  'd54b9a9e-eea2-4fee-9c1e-23d6bb002cd9',
  '6e6c2f6e-39e2-422b-bc19-2fb5dca0956c',
  '5226a3bd-5d30-41ec-8885-78e9dc63c957',
  '2050f633-5663-46b4-a8f0-20c4cde6b36c',
  'ab287131-dfbb-4116-8ef7-0189fb4840f6',
  '9e5a420f-4110-4355-ad14-32776e5d820a',
];
const SEC_INACTIVE_OLD = [
  '7d694d7f-2f5e-4549-bf31-bd31512f30c2',
  '470fd3c3-0bc8-4900-8d9b-7d1a0bcd6fdc',
  '7359744c-b03e-4e58-8421-d518087f0830',
  'c8cdcced-01fd-4e05-934b-87097b8bbbe3',
  'a895b383-195b-4ca0-af4d-c9165983885f',
];
const SEC_INACTIVE_NEW = ['7f57affa-10d2-44b2-9413-dda04735e574'];

// ── Derived sets ──────────────────────────────────────────────────────────────

const DELETED_IDS = [
  ...STACK_ACTIVE_OLD,
  ...STACK_INACTIVE_OLD,
  ...O11Y_ACTIVE_OLD,
  ...O11Y_INACTIVE_OLD,
  ...SEC_ACTIVE_OLD,
  ...SEC_INACTIVE_OLD,
]; // 4+3+1+2+3+5 = 18

const SURVIVING_IDS = [
  ...STACK_ACTIVE_NEW,
  ...STACK_INACTIVE_NEW,
  ...O11Y_ACTIVE_NEW,
  ...O11Y_INACTIVE_NEW,
  ...SEC_ACTIVE_NEW,
  ...SEC_INACTIVE_NEW,
]; // 1+2+4+3+6+1 = 17

const ALL_TEST_IDS = [...DELETED_IDS, ...SURVIVING_IDS]; // 35 total

// ── Bulk operations builder ───────────────────────────────────────────────────

const buildBulkOps = () => {
  const docs: Array<{ _index: string; _id: string; _source: Record<string, unknown> }> = [
    // Stack
    ...STACK_ACTIVE_OLD.map((_id) => ({
      _index: CAT.stack.index,
      _id,
      _source: makeActive(_id, CAT.stack, OLD_TS),
    })),
    ...STACK_ACTIVE_NEW.map((_id) => ({
      _index: CAT.stack.index,
      _id,
      _source: makeActive(_id, CAT.stack, NEW_TS),
    })),
    ...STACK_INACTIVE_OLD.map((_id) => ({
      _index: CAT.stack.index,
      _id,
      _source: makeRecovered(_id, CAT.stack, OLD_TS),
    })),
    ...STACK_INACTIVE_NEW.map((_id) => ({
      _index: CAT.stack.index,
      _id,
      _source: makeRecovered(_id, CAT.stack, NEW_TS),
    })),
    // O11y
    ...O11Y_ACTIVE_OLD.map((_id) => ({
      _index: CAT.o11y.index,
      _id,
      _source: makeActive(_id, CAT.o11y, OLD_TS),
    })),
    ...O11Y_ACTIVE_NEW.map((_id) => ({
      _index: CAT.o11y.index,
      _id,
      _source: makeActive(_id, CAT.o11y, NEW_TS),
    })),
    ...O11Y_INACTIVE_OLD.map((_id) => ({
      _index: CAT.o11y.index,
      _id,
      _source: makeRecovered(_id, CAT.o11y, OLD_TS),
    })),
    ...O11Y_INACTIVE_NEW.map((_id) => ({
      _index: CAT.o11y.index,
      _id,
      _source: makeRecovered(_id, CAT.o11y, NEW_TS),
    })),
    // Security — active
    ...SEC_ACTIVE_OLD.map((_id) => ({
      _index: CAT.security.index,
      _id,
      _source: makeActive(_id, CAT.security, OLD_TS),
    })),
    ...SEC_ACTIVE_NEW.map((_id) => ({
      _index: CAT.security.index,
      _id,
      _source: makeActive(_id, CAT.security, NEW_TS),
    })),
    // Security — inactive (detection-style: workflow_status=closed, no kibana.alert.end)
    ...SEC_INACTIVE_OLD.map((_id) => ({
      _index: CAT.security.index,
      _id,
      _source: makeSecurityInactive(_id, OLD_TS),
    })),
    ...SEC_INACTIVE_NEW.map((_id) => ({
      _index: CAT.security.index,
      _id,
      _source: makeSecurityInactive(_id, NEW_TS),
    })),
  ];
  return docs.flatMap(({ _index, _id, _source }) => [{ index: { _index, _id } }, _source]);
};

// ── Suite ─────────────────────────────────────────────────────────────────────

test.describe('Alert deletion', { tag: tags.stateful.classic }, () => {
  test.beforeEach(async ({ browserAuth, esClient, page }) => {
    // Remove any leftover test docs from prior runs
    try {
      await esClient.deleteByQuery({
        index: ALERTS_INDEX_PATTERN,
        refresh: true,
        conflicts: 'proceed',
        query: { ids: { values: ALL_TEST_IDS } },
      });
    } catch {
      // index may not exist on first run
    }

    // Remove stale delete-alerts event log entries from prior runs
    try {
      await esClient.deleteByQuery({
        index: EVENT_LOG_INDEX,
        refresh: true,
        conflicts: 'proceed',
        query: { match: { 'event.action': 'delete-alerts' } },
      });
    } catch {
      // event log index may not exist yet
    }

    // Index all 35 test alert documents across stack, o11y, and security indices
    await esClient.bulk({
      refresh: 'wait_for',
      operations: buildBulkOps(),
    });

    await browserAuth.loginAsAdmin();
    await page.gotoApp('rules');
  });

  test.afterEach(async ({ esClient }) => {
    try {
      await esClient.deleteByQuery({
        index: ALERTS_INDEX_PATTERN,
        refresh: true,
        conflicts: 'proceed',
        query: { ids: { values: ALL_TEST_IDS } },
      });
    } catch {
      // index may not exist
    }
  });

  test('should delete alerts older than 90 days when scheduling alert deletion task', async ({
    page,
    esClient,
  }) => {
    // Open the rules settings flyout and navigate to the alert deletion modal
    await page.testSubj.click('rulesSettingsLink');
    await page.testSubj.click('alert-delete-open-modal-button');

    // Enable both active- and inactive-alert deletion
    await page.testSubj.click('alert-delete-active-checkbox');
    await page.testSubj.click('alert-delete-inactive-checkbox');

    // Wait for the confirmation text-field to become enabled, then fill it
    await expect(page.testSubj.locator('alert-delete-delete-confirmation')).toBeEnabled();
    await page.testSubj.locator('alert-delete-delete-confirmation').fill('Delete');

    await page.testSubj.click('alert-delete-submit');

    // Poll the event log until the delete-alerts task completes successfully.
    // Also verify num_deleted matches the expected count (matches FTR assertion).
    await expect
      .poll(
        async () => {
          try {
            const results = await esClient.search<{
              event?: { action?: string; outcome?: string };
              kibana?: { alert?: { deletion?: { num_deleted?: number } } };
            }>({
              index: EVENT_LOG_INDEX,
              query: { match: { 'event.action': 'delete-alerts' } },
            });
            const hit = results.hits.hits[0];
            return {
              outcome: hit?._source?.event?.outcome,
              numDeleted: hit?._source?.kibana?.alert?.deletion?.num_deleted,
            };
          } catch {
            return undefined;
          }
        },
        { timeout: 30_000, intervals: [1_000] }
      )
      .toStrictEqual({ outcome: 'success', numDeleted: DELETED_IDS.length });

    // Verify exactly the 17 surviving docs remain across all three alert indices;
    // all 18 docs that were older than 90 days must be gone.
    await expect
      .poll(
        async () => {
          const results = await esClient.search({
            index: ALERTS_INDEX_PATTERN,
            size: 50,
            query: { ids: { values: ALL_TEST_IDS } },
          });
          return results.hits.hits.map((h) => h._id).sort();
        },
        { timeout: 15_000, intervals: [1_000] }
      )
      .toStrictEqual([...SURVIVING_IDS].sort());
  });
});
