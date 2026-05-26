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
// Simplified: uses 3 inline stack alert docs (2 older-than-90d, 1 newer-than-90d)
// instead of the full cross-category fixture from alert_deletion_test_utils.ts.
// The alert_deletion_test_utils.ts lives outside this Scout tsconfig's scope, so
// the test data is inlined. Core behaviour (delete modal → task runs → old alerts
// deleted, new alerts kept) is preserved 1:1.

const STACK_ALERTS_INDEX = '.internal.alerts-stack.alerts-default-000001';
const ALERTS_INDEX_PATTERN = '.internal.alerts-*';
const EVENT_LOG_INDEX = '.kibana-event-log*';

// 100 days in the past — outside the 90-day default deletion threshold
const OLD_TS = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString();
// 10 days in the past — inside the 90-day threshold (should survive deletion)
const NEW_TS = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
// 1 hour before OLD_TS (used as alert start for the inactive alert)
const OLD_START_TS = new Date(Date.parse(OLD_TS) - 60 * 60 * 1000).toISOString();

const OLD_ACTIVE_ID = 'scout-alert-deletion-old-active';
const OLD_INACTIVE_ID = 'scout-alert-deletion-old-inactive';
const NEW_ACTIVE_ID = 'scout-alert-deletion-new-active';

const BASE_FIELDS = {
  'kibana.alert.rule.category': 'Elasticsearch query',
  'kibana.alert.rule.consumer': 'stackAlerts',
  'kibana.alert.rule.rule_type_id': '.es-query',
  'kibana.alert.rule.execution.uuid': 'scout-exec-uuid',
  'kibana.alert.rule.name': 'scout-test-rule',
  'kibana.alert.rule.parameters': {},
  'kibana.alert.rule.producer': 'stackAlerts',
  'kibana.alert.rule.revision': 0,
  'kibana.alert.rule.tags': [],
  'kibana.alert.rule.uuid': 'scout-rule-uuid',
  'kibana.space_ids': ['default'],
  'event.kind': 'signal',
  'kibana.alert.flapping': false,
  'kibana.alert.flapping_history': [],
  'kibana.alert.instance.id': 'query matched',
  'kibana.alert.maintenance_window_ids': [],
  'kibana.alert.consecutive_matches': 1,
  'kibana.alert.pending_recovered_count': 0,
  'kibana.alert.workflow_status': 'open',
  'kibana.version': '9.1.0',
  tags: [],
};

const makeActiveAlertDoc = (id: string, timestamp: string) => ({
  ...BASE_FIELDS,
  '@timestamp': timestamp,
  'kibana.alert.rule.execution.timestamp': timestamp,
  'kibana.alert.start': timestamp,
  'event.action': 'active',
  'kibana.alert.status': 'active',
  'kibana.alert.action_group': 'query matched',
  'kibana.alert.uuid': id,
  'kibana.alert.reason': 'Test active alert',
  'kibana.alert.title': 'test rule active',
});

const makeInactiveAlertDoc = (id: string, endTimestamp: string, startTimestamp: string) => ({
  ...BASE_FIELDS,
  '@timestamp': endTimestamp,
  'kibana.alert.rule.execution.timestamp': endTimestamp,
  'kibana.alert.start': startTimestamp,
  'kibana.alert.end': endTimestamp,
  'kibana.alert.time_range': { gte: startTimestamp, lte: endTimestamp },
  'event.action': 'close',
  'kibana.alert.status': 'recovered',
  'kibana.alert.action_group': 'recovered',
  'kibana.alert.uuid': id,
  'kibana.alert.duration.us': 3_600_000_000,
  'kibana.alert.reason': 'Test inactive alert',
  'kibana.alert.title': 'test rule recovered',
});

test.describe('Alert deletion', { tag: tags.stateful.classic }, () => {
  const testDocIds = [OLD_ACTIVE_ID, OLD_INACTIVE_ID, NEW_ACTIVE_ID];

  const cleanTestDocs = async (esClient: { deleteByQuery: Function }) => {
    try {
      await esClient.deleteByQuery({
        index: ALERTS_INDEX_PATTERN,
        refresh: true,
        conflicts: 'proceed',
        query: { ids: { values: testDocIds } },
      });
    } catch {
      // index may not exist on first run
    }
  };

  test.beforeEach(async ({ browserAuth, esClient, page }) => {
    await cleanTestDocs(esClient);

    // Clean any stale delete-alerts event log entries from previous runs
    try {
      await esClient.deleteByQuery({
        index: EVENT_LOG_INDEX,
        conflicts: 'proceed',
        query: { match: { 'event.action': 'delete-alerts' } },
      });
    } catch {
      // event log index may not exist yet
    }

    // Index 3 test alert docs
    await esClient.bulk({
      refresh: 'wait_for',
      operations: [
        { index: { _index: STACK_ALERTS_INDEX, _id: OLD_ACTIVE_ID } },
        makeActiveAlertDoc(OLD_ACTIVE_ID, OLD_TS),
        { index: { _index: STACK_ALERTS_INDEX, _id: OLD_INACTIVE_ID } },
        makeInactiveAlertDoc(OLD_INACTIVE_ID, OLD_TS, OLD_START_TS),
        { index: { _index: STACK_ALERTS_INDEX, _id: NEW_ACTIVE_ID } },
        makeActiveAlertDoc(NEW_ACTIVE_ID, NEW_TS),
      ],
    });

    await browserAuth.loginAsAdmin();
    await page.gotoApp('rules');
  });

  test.afterEach(async ({ esClient }) => {
    await cleanTestDocs(esClient);
  });

  test('should delete alerts older than 90 days when scheduling alert deletion task', async ({
    page,
    esClient,
  }) => {
    // Open the settings flyout and navigate to the alert deletion modal
    await page.testSubj.click('rulesSettingsLink');
    await page.testSubj.click('alert-delete-open-modal-button');

    // Enable both active- and inactive-alert deletion
    await page.testSubj.click('alert-delete-active-checkbox');
    await page.testSubj.click('alert-delete-inactive-checkbox');

    // Wait for the confirmation text-field to become enabled, then fill it
    await expect(page.testSubj.locator('alert-delete-delete-confirmation')).toBeEnabled();
    await page.testSubj.locator('alert-delete-delete-confirmation').fill('Delete');

    await page.testSubj.click('alert-delete-submit');

    // Poll the event log until the delete-alerts task completes successfully
    await expect
      .poll(
        async () => {
          try {
            const results = await esClient.search<{
              event?: { action?: string; outcome?: string };
            }>({
              index: EVENT_LOG_INDEX,
              query: { match: { 'event.action': 'delete-alerts' } },
            });
            const hit = results.hits.hits[0];
            return hit?._source?.event?.outcome;
          } catch {
            return undefined;
          }
        },
        { timeout: 30_000, intervals: [1_000] }
      )
      .toBe('success');

    // The 2 old alerts should be gone; the 1 new alert must survive
    await expect
      .poll(
        async () => {
          const results = await esClient.search({
            index: ALERTS_INDEX_PATTERN,
            size: 10,
            query: { ids: { values: testDocIds } },
          });
          return results.hits.hits.map((h) => h._id).sort();
        },
        { timeout: 15_000, intervals: [1_000] }
      )
      .toEqual([NEW_ACTIVE_ID]);
  });
});
