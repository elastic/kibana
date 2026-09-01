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
const RULE_ID = 'nightshift-investigation-rule';
const ALERT_INDEX = '.alerts-observability.apm.alerts-default';

test.describe(
  'Observability alert investigation action',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeAll(async ({ esClient }) => {
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
          'kibana.alert.rule.name': 'Nightshift investigation test rule',
          'kibana.alert.rule.producer': 'apm',
          'kibana.alert.rule.rule_type_id': 'apm.transaction_error_rate',
          'kibana.alert.rule.uuid': RULE_ID,
          'kibana.space_ids': ['default'],
          'kibana.version': '8.0.0',
        },
      });
    });

    test.afterAll(async ({ esClient }) => {
      await esClient.delete({ index: ALERT_INDEX, id: ALERT_ID, refresh: true });
    });

    test('starts an investigation from an alert row action', async ({ browserAuth, page }) => {
      await browserAuth.loginAsAdmin();
      await mockStartInvestigation(page);
      await page.gotoApp('observability/alerts');
      await page.testSubj.locator('alertsTableIsLoaded').waitFor({ state: 'visible' });

      const requestPromise = page.waitForRequest(
        (request) =>
          request.method() === 'POST' &&
          request.url().endsWith('/internal/nightshift/investigations')
      );
      await page.testSubj.locator('alertsTableRowActionMore').click();
      await page.testSubj.locator('o11yAlertActionsInvestigate').click();

      const request = await requestPromise;
      expect(request.postDataJSON()).toMatchObject({
        subject: { type: 'alert', id: ALERT_ID },
        concurrency_key: ALERT_ID,
        context: {
          alerts: [{ id: ALERT_ID, rule_id: RULE_ID }],
        },
      });
    });
  }
);
