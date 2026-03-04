/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { ALERT_RULE_NAME, ALERT_STATUS } from '@kbn/rule-data-utils';
import { test } from '../fixtures';

const TEST_RUN_ID = Date.now();
const INDEX_THRESHOLD_RULE_NAME = `Scout Rule Details Index Threshold ${TEST_RUN_ID}`;
const ALERTS_INDEX_PATTERN = '.alerts-stack.alerts-*';
const STATEFUL_ALERTS_INDEX = '.internal.alerts-stack.alerts-default-000001';
const INDEX_THRESHOLD_RULE_TYPE_ID = '.index-threshold';

test.describe('Rule details alerts tab', { tag: tags.stateful.classic }, () => {
  let indexThresholdRuleId: string;

  test.beforeAll(async ({ apiServices }) => {
    const indexThresholdRuleResponse = await apiServices.alerting.rules.create({
      name: INDEX_THRESHOLD_RULE_NAME,
      ruleTypeId: INDEX_THRESHOLD_RULE_TYPE_ID,
      consumer: 'alerts',
      enabled: false,
      schedule: { interval: '1m' },
      actions: [],
      params: {
        aggType: 'count',
        termSize: 5,
        thresholdComparator: '>',
        timeWindowSize: 5,
        timeWindowUnit: 'm',
        groupBy: 'all',
        threshold: [1000],
        index: ['.kibana'],
        timeField: '@timestamp',
      },
    });

    indexThresholdRuleId = indexThresholdRuleResponse.data.id;
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test.afterAll(async ({ apiServices, esClient }) => {
    const ruleIds = [indexThresholdRuleId].filter(Boolean);

    if (ruleIds.length === 0) {
      return;
    }

    try {
      await esClient.deleteByQuery({
        index: ALERTS_INDEX_PATTERN,
        refresh: true,
        conflicts: 'proceed',
        query: {
          terms: { 'kibana.alert.rule.uuid': ruleIds },
        },
      });
    } catch {
      // Continue cleanup even if alert deletion fails
    }

    for (const ruleId of ruleIds) {
      try {
        await apiServices.alerting.rules.delete(ruleId);
      } catch {
        // Continue cleanup even if rule deletion fails
      }
    }
  });

  test('filters alerts table with search bar query', async ({ pageObjects, esClient }) => {
    const now = new Date().toISOString();

    const createAlertDocument = ({
      idSuffix,
      ruleId,
      ruleName,
      ruleTypeId,
      ruleCategory,
      ruleConsumer,
      status,
    }: {
      idSuffix: string;
      ruleId: string;
      ruleName: string;
      ruleTypeId: string;
      ruleCategory: string;
      ruleConsumer: string;
      status: string;
    }) => ({
      '@timestamp': now,
      'kibana.alert.uuid': `${ruleId}-${idSuffix}-${TEST_RUN_ID}`,
      'kibana.alert.start': now,
      'kibana.alert.status': status,
      'kibana.alert.workflow_status': 'open',
      'kibana.alert.rule.name': ruleName,
      'kibana.alert.rule.uuid': ruleId,
      'kibana.alert.rule.rule_type_id': ruleTypeId,
      'kibana.alert.rule.category': ruleCategory,
      'kibana.alert.rule.consumer': ruleConsumer,
      'kibana.alert.time_range': { gte: now },
      'kibana.space_ids': ['default'],
      'event.kind': 'signal',
      'event.action': 'open',
    });

    await test.step('index alerts for filtering', async () => {
      await esClient.index({
        index: STATEFUL_ALERTS_INDEX,
        refresh: 'wait_for',
        document: createAlertDocument({
          idSuffix: 'active',
          ruleId: indexThresholdRuleId,
          ruleName: INDEX_THRESHOLD_RULE_NAME,
          ruleTypeId: INDEX_THRESHOLD_RULE_TYPE_ID,
          ruleCategory: 'index threshold',
          ruleConsumer: 'alerts',
          status: 'active',
        }),
      });

      await esClient.index({
        index: STATEFUL_ALERTS_INDEX,
        refresh: 'wait_for',
        document: createAlertDocument({
          idSuffix: 'recovered',
          ruleId: indexThresholdRuleId,
          ruleName: INDEX_THRESHOLD_RULE_NAME,
          ruleTypeId: INDEX_THRESHOLD_RULE_TYPE_ID,
          ruleCategory: 'index threshold',
          ruleConsumer: 'alerts',
          status: 'recovered',
        }),
      });
    });

    await pageObjects.ruleDetailsPage.gotoById(indexThresholdRuleId);
    await expect(pageObjects.ruleDetailsPage.ruleName).toHaveText(INDEX_THRESHOLD_RULE_NAME);
    await pageObjects.ruleDetailsPage.expectAlertsTabLoaded();

    await test.step('filter alerts by status', async () => {
      await expect(pageObjects.ruleDetailsPage.alertSummaryTotalCount).toHaveText('2');
      await pageObjects.ruleDetailsPage.filterAlertsByKql('kibana.alert.status : "active"');

      await pageObjects.ruleDetailsPage.alertsTable.ensureGridVisible();
      const ruleNameCells =
        pageObjects.ruleDetailsPage.alertsTable.getAllCellLocatorByColId(ALERT_RULE_NAME);
      await expect(ruleNameCells).toHaveCount(1);
      await expect(ruleNameCells).toContainText(INDEX_THRESHOLD_RULE_NAME);

      const statusCells =
        pageObjects.ruleDetailsPage.alertsTable.getAllCellLocatorByColId(ALERT_STATUS);
      await expect(statusCells).toHaveCount(1);
      await expect(statusCells).toHaveText(/active/i);

      await expect(pageObjects.ruleDetailsPage.alertSummaryTotalCount).toHaveText('1');
    });
  });
});
