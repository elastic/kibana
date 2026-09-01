/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags, test } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { mockStartInvestigation } from '../fixtures/mocks';

const ALERT_ID = 'nightshift-investigation-alert';
const ALERT_INDEX = '.alerts-observability.apm.alerts-default';
const RULE_NAME = 'Nightshift investigation test rule';

test.describe(
  'Observability alert investigation action',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let ruleId: string;

    test.beforeAll(async ({ apiServices, esClient }) => {
      const createdRule = await apiServices.alerting.rules.create({
        tags: [],
        params: {
          criteria: [],
          alertOnNoData: false,
          alertOnGroupDisappear: false,
          searchConfiguration: {
            query: { query: '', language: 'kuery' },
            index: 'metrics-*',
          },
        },
        schedule: { interval: '1m' },
        consumer: 'alerts',
        name: RULE_NAME,
        ruleTypeId: 'observability.rules.custom_threshold',
        actions: [],
      });
      ruleId = createdRule.data.id;

      const timestamp = new Date().toISOString();
      await esClient.index({
        index: ALERT_INDEX,
        id: ALERT_ID,
        op_type: 'create',
        refresh: 'wait_for',
        document: {
          '@timestamp': timestamp,
          'event.kind': 'signal',
          'kibana.alert.uuid': ALERT_ID,
          'kibana.alert.flapping': false,
          'kibana.alert.reason': 'Failed transaction rate exceeded the threshold',
          'kibana.alert.status': 'active',
          'kibana.alert.start': timestamp,
          'kibana.alert.workflow_status': 'open',
          'kibana.alert.rule.category': 'Failed transaction rate threshold',
          'kibana.alert.rule.consumer': 'alerts',
          'kibana.alert.rule.name': RULE_NAME,
          'kibana.alert.rule.producer': 'apm',
          'kibana.alert.rule.rule_type_id': 'observability.rules.custom_threshold',
          'kibana.alert.rule.uuid': ruleId,
          'kibana.space_ids': ['default'],
          'kibana.version': '8.0.0',
        },
      });
    });

    test.afterAll(async ({ apiServices, esClient }) => {
      await esClient.delete({ index: ALERT_INDEX, id: ALERT_ID, refresh: true });
      await apiServices.alerting.rules.delete(ruleId);
    });

    const expectInvestigationRequest = async (
      page: Parameters<typeof mockStartInvestigation>[0]
    ) => {
      const requestPromise = page.waitForRequest(
        (request) =>
          request.method() === 'POST' &&
          request.url().endsWith('/internal/nightshift/investigations')
      );
      await page.testSubj.locator('o11yAlertActionsInvestigate').click();

      expect((await requestPromise).postDataJSON()).toMatchObject({
        subject: { type: 'alert', id: ALERT_ID },
        concurrency_key: ALERT_ID,
        context: { alerts: [{ id: ALERT_ID, rule_id: ruleId }] },
      });
    };

    test.beforeEach(async ({ browserAuth, page }) => {
      await browserAuth.loginAsAdmin();
      await mockStartInvestigation(page);
    });

    test('starts an investigation from an alert row action', async ({ page }) => {
      await page.gotoApp('observability/alerts');
      await page.testSubj.locator('alertsTableIsLoaded').waitFor({ state: 'visible' });
      await page.testSubj.locator('alertsTableRowActionMore').click();
      await expectInvestigationRequest(page);
    });

    test('starts an investigation from the alert detail action menu', async ({ page }) => {
      await page.gotoApp(`observability/alerts/${ALERT_ID}`);
      await page.testSubj.locator('alert-details-header-actions-menu-button').click();

      const requestPromise = page.waitForRequest(
        (request) =>
          request.method() === 'POST' &&
          request.url().endsWith('/internal/nightshift/investigations')
      );
      await page.testSubj.locator('alertDetailsInvestigate').click();
      expect((await requestPromise).postDataJSON()).toMatchObject({
        subject: { type: 'alert', id: ALERT_ID },
      });
    });

    test('shows the investigation action on the rule detail alerts table', async ({ page }) => {
      await page.gotoApp(`observability/alerts/rules/${ruleId}`);
      await page.testSubj.locator('alertsTableIsLoaded').waitFor({ state: 'visible' });
      await page.testSubj.locator('alertsTableRowActionMore').click();
      await expectInvestigationRequest(page);
    });
  }
);
