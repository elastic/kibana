/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  activeO11yAlertsNewerThan90,
  activeO11yAlertsOlderThan90,
  activeSecurityAlertsNewerThan90,
  activeSecurityAlertsOlderThan90,
  activeStackAlertsNewerThan90,
  activeStackAlertsOlderThan90,
  getTestAlertDocs,
  inactiveO11yAlertsNewerThan90,
  inactiveO11yAlertsOlderThan90,
  inactiveSecurityAlertsNewerThan90,
  inactiveSecurityAlertsOlderThan90,
  inactiveStackAlertsNewerThan90,
  inactiveStackAlertsOlderThan90,
} from '@kbn/alerting-api-integration-helpers';
import { test } from '../fixtures';

const ALERT_INDEX_ALIASES = [
  {
    index: '.internal.alerts-stack.alerts-default-000001',
    alias: '.alerts-stack.alerts-default',
  },
  {
    index: '.internal.alerts-observability.threshold.alerts-default-000001',
    alias: '.alerts-observability.threshold.alerts-default',
  },
  {
    index: '.internal.alerts-security.alerts-default-000001',
    alias: '.alerts-security.alerts-default',
  },
] as const;

const DELETED_ALERT_IDS = [
  ...activeStackAlertsOlderThan90,
  ...inactiveStackAlertsOlderThan90,
  ...activeO11yAlertsOlderThan90,
  ...inactiveO11yAlertsOlderThan90,
  ...activeSecurityAlertsOlderThan90,
  ...inactiveSecurityAlertsOlderThan90,
].map(({ default: { id } }) => id);

const EXPECTED_ALERT_IDS = [
  ...activeStackAlertsNewerThan90,
  ...inactiveStackAlertsNewerThan90,
  ...activeO11yAlertsNewerThan90,
  ...inactiveO11yAlertsNewerThan90,
  ...activeSecurityAlertsNewerThan90,
  ...inactiveSecurityAlertsNewerThan90,
].map(({ default: { id } }) => id);

const ALL_ALERT_IDS = [...DELETED_ALERT_IDS, ...EXPECTED_ALERT_IDS];

const DELETE_PASSKEY = 'Delete';
const SUCCESS_MESSAGE = 'Clean up task started successfully';

test.describe('Alert deletion', { tag: tags.stateful.classic }, () => {
  test.beforeEach(async ({ esClient, browserAuth, page }) => {
    await Promise.all(
      ALERT_INDEX_ALIASES.map(async ({ index, alias }) => {
        await esClient.indices.create({ index }, { ignore: [400] });
        await esClient.indices.putAlias({ index, name: alias });
      })
    );

    await esClient.deleteByQuery({
      index: '.internal.alerts-*',
      query: { ids: { values: ALL_ALERT_IDS } },
      refresh: true,
      conflicts: 'proceed',
    });

    await esClient.bulk({
      refresh: 'wait_for',
      operations: getTestAlertDocs('default').flatMap(({ _index, _id, _source }) => [
        { index: { _index, _id } },
        _source,
      ]),
    });

    await browserAuth.loginAsAdmin();
    await page.gotoApp('rules');
  });

  test.afterEach(async ({ esClient }) => {
    await esClient.deleteByQuery({
      index: '.internal.alerts-*',
      query: { ids: { values: ALL_ALERT_IDS } },
      refresh: true,
      conflicts: 'proceed',
    });
    await esClient.deleteByQuery({
      index: '.kibana-event-log*',
      query: { bool: { must: [{ match: { 'event.action': 'delete-alerts' } }] } },
      refresh: true,
      conflicts: 'proceed',
    });
  });

  test('schedules a deletion task and removes old alerts', async ({ page, esClient }) => {
    await page.testSubj.click('rulesSettingsLink');
    const settingsFlyout = page.testSubj.locator('rulesSettingsFlyout');
    await expect(settingsFlyout).toBeVisible();

    await settingsFlyout.getByTestId('alert-delete-open-modal-button').click();
    await expect(page.testSubj.locator('alert-delete-modal')).toBeVisible();

    await page.testSubj.click('alert-delete-active-checkbox');
    await page.testSubj.click('alert-delete-inactive-checkbox');

    const confirmField = page.testSubj.locator('alert-delete-delete-confirmation');
    await expect(confirmField).toBeEnabled({ timeout: 15000 });

    await confirmField.fill(DELETE_PASSKEY);
    const deleteRequestedAt = new Date().toISOString();
    await page.testSubj.click('alert-delete-submit');

    await expect(page.testSubj.locator('alert-delete-modal')).toBeHidden();
    await expect(page.testSubj.locator('euiToastHeader__title')).toContainText(SUCCESS_MESSAGE);

    await expect
      .poll(
        async () => {
          const result = await esClient.search({
            index: '.kibana-event-log*',
            size: 1,
            sort: [{ '@timestamp': 'desc' }],
            query: {
              bool: {
                must: [
                  { match: { 'event.action': 'delete-alerts' } },
                  { range: { '@timestamp': { gte: deleteRequestedAt } } },
                ],
              },
            },
          });

          const source = result.hits.hits[0]?._source as
            | {
                event?: { outcome?: string };
                kibana?: { alert?: { deletion?: { num_deleted?: number } } };
              }
            | undefined;

          return {
            outcome: source?.event?.outcome,
            numDeleted: source?.kibana?.alert?.deletion?.num_deleted,
          };
        },
        { timeout: 30000, intervals: [2000] }
      )
      .toMatchObject({
        outcome: 'success',
        numDeleted: DELETED_ALERT_IDS.length,
      });

    // Only the newer alerts should remain across stack, observability, and
    // security.
    const remaining = await esClient.search({
      index: '.internal.alerts-*',
      size: ALL_ALERT_IDS.length,
      query: { ids: { values: ALL_ALERT_IDS } },
    });

    expect(remaining.hits.hits).toHaveLength(EXPECTED_ALERT_IDS.length);
    const remainingIds = remaining.hits.hits.map((h) => h._id);
    expect(remainingIds).toStrictEqual(expect.arrayContaining(EXPECTED_ALERT_IDS));
    expect(remainingIds).toStrictEqual(expect.not.arrayContaining(DELETED_ALERT_IDS));
  });
});
