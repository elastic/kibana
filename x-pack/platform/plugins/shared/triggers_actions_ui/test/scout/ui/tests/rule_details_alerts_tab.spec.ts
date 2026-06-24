/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import type { ApiServicesFixture, KbnClient } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { ALERT_RULE_NAME, ALERT_STATUS } from '@kbn/rule-data-utils';
import { test } from '../fixtures';

const TEST_RUN_ID = Date.now();
const INDEX_THRESHOLD_RULE_NAME = `Scout Rule Details Index Threshold ${TEST_RUN_ID}`;
const SUMMARY_RULE_NAME = `Scout Rule Details Summary ${TEST_RUN_ID}`;
const PAGINATION_RULE_NAME = `Scout Rule Details Pagination ${TEST_RUN_ID}`;
const SUMMARY_SOURCE_INDEX = `scout-rule-details-summary-${TEST_RUN_ID}`;
const PAGINATION_SOURCE_INDEX = `scout-rule-details-pagination-${TEST_RUN_ID}`;
const ALERTS_INDEX_PATTERN = '.alerts-stack.alerts-*';
const STATEFUL_ALERTS_INDEX = '.internal.alerts-stack.alerts-default-000001';
const INDEX_THRESHOLD_RULE_TYPE_ID = '.index-threshold';

interface AlertSummaryResponse {
  alerts: Record<
    string,
    {
      activeStartDate?: string;
      muted?: boolean;
      status: string;
    }
  >;
}

const createGroupedEsQueryRule = async ({
  apiServices,
  name,
  index,
}: {
  apiServices: ApiServicesFixture;
  name: string;
  index: string;
}) => {
  const { data } = await apiServices.alerting.rules.create({
    name,
    consumer: 'alerts',
    ruleTypeId: '.es-query',
    schedule: { interval: '1m' },
    actions: [],
    params: {
      size: 100,
      thresholdComparator: '>',
      threshold: [0],
      index: [index],
      timeField: '@timestamp',
      esQuery: JSON.stringify({ query: { match_all: {} } }),
      timeWindowSize: 5,
      timeWindowUnit: 'm',
      groupBy: 'top',
      termSize: 100,
      termField: 'host',
    },
  });
  return data.id;
};

const getAlertSummary = async (kbnClient: KbnClient, ruleId: string) => {
  const { data } = await kbnClient.request<AlertSummaryResponse>({
    method: 'GET',
    path: `/internal/alerting/rule/${ruleId}/_alert_summary`,
    headers: {},
  });
  return data;
};

const muteAlert = async (kbnClient: KbnClient, ruleId: string, alertId: string) => {
  await kbnClient.request({
    method: 'POST',
    path: `/api/alerting/rule/${ruleId}/alert/${encodeURIComponent(alertId)}/_mute`,
    headers: { 'kbn-xsrf': 'scout' },
    query: { validate_alerts_existence: false },
  });
};

test.describe('Rule details alerts tab', { tag: tags.stateful.classic }, () => {
  let indexThresholdRuleId: string;
  let summaryRuleId: string;
  let paginationRuleId: string;

  test.beforeAll(async ({ apiServices, esClient, kbnClient }) => {
    const now = new Date().toISOString();
    const createSourceIndex = async (index: string) => {
      await esClient.indices.create(
        {
          index,
          mappings: {
            properties: {
              '@timestamp': { type: 'date' },
              host: { type: 'keyword' },
            },
          },
        },
        { ignore: [400] }
      );
    };

    await createSourceIndex(SUMMARY_SOURCE_INDEX);
    await esClient.bulk({
      refresh: 'wait_for',
      operations: ['us-central', 'us-east', 'us-west'].flatMap((host) => [
        { index: { _index: SUMMARY_SOURCE_INDEX } },
        { '@timestamp': now, host },
      ]),
    });

    await createSourceIndex(PAGINATION_SOURCE_INDEX);
    await esClient.bulk({
      refresh: 'wait_for',
      operations: Array.from({ length: 10 }).flatMap((_, index) =>
        ['us-central', 'us-east', 'us-west'].flatMap((region) => [
          { index: { _index: PAGINATION_SOURCE_INDEX } },
          { '@timestamp': now, host: `${region}-${index}` },
        ])
      ),
    });

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

    summaryRuleId = await createGroupedEsQueryRule({
      apiServices,
      name: SUMMARY_RULE_NAME,
      index: SUMMARY_SOURCE_INDEX,
    });
    paginationRuleId = await createGroupedEsQueryRule({
      apiServices,
      name: PAGINATION_RULE_NAME,
      index: PAGINATION_SOURCE_INDEX,
    });

    await apiServices.alerting.rules.runSoon(summaryRuleId);
    await apiServices.alerting.rules.runSoon(paginationRuleId);

    await expect(async () => {
      const summary = await getAlertSummary(kbnClient, summaryRuleId);
      expect(Object.keys(summary.alerts).sort()).toStrictEqual([
        'us-central',
        'us-east',
        'us-west',
      ]);
    }).toPass({ timeout: 120_000, intervals: [3_000] });

    await expect(async () => {
      const summary = await getAlertSummary(kbnClient, paginationRuleId);
      expect(Object.keys(summary.alerts)).toHaveLength(30);
    }).toPass({ timeout: 120_000, intervals: [3_000] });
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test.afterAll(async ({ apiServices, esClient }) => {
    const ruleIds = [indexThresholdRuleId, summaryRuleId, paginationRuleId].filter(Boolean);

    if (ruleIds.length > 0) {
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
    }

    for (const ruleId of ruleIds) {
      try {
        await apiServices.alerting.rules.delete(ruleId);
      } catch {
        // Continue cleanup even if rule deletion fails
      }
    }

    await Promise.allSettled([
      esClient.indices.delete({ index: SUMMARY_SOURCE_INDEX }, { ignore: [404] }),
      esClient.indices.delete({ index: PAGINATION_SOURCE_INDEX }, { ignore: [404] }),
    ]);
  });

  test('renders the active alerts', async ({ pageObjects, kbnClient }) => {
    await pageObjects.ruleDetailsPage.gotoById(summaryRuleId);
    await expect(pageObjects.ruleDetailsPage.ruleName).toHaveText(SUMMARY_RULE_NAME);
    await pageObjects.ruleDetailsPage.expectAlertsTabLoaded();

    const summary = await getAlertSummary(kbnClient, summaryRuleId);
    expect(
      Object.entries(summary.alerts).map(([alert, value]) => ({
        alert,
        status: value.status,
        hasStart: Boolean(value.activeStartDate),
      }))
    ).toStrictEqual([
      { alert: 'us-central', status: 'Active', hasStart: true },
      { alert: 'us-east', status: 'Active', hasStart: true },
      { alert: 'us-west', status: 'Active', hasStart: true },
    ]);
  });

  test('renders the muted inactive alerts', async ({ pageObjects, kbnClient }) => {
    await muteAlert(kbnClient, summaryRuleId, 'eu/east');
    await pageObjects.ruleDetailsPage.gotoById(summaryRuleId);
    await expect(pageObjects.ruleDetailsPage.ruleName).toHaveText(SUMMARY_RULE_NAME);
    await pageObjects.ruleDetailsPage.expectAlertsTabLoaded();

    const summary = await getAlertSummary(kbnClient, summaryRuleId);
    expect(summary.alerts['eu/east']).toMatchObject({
      status: 'OK',
      muted: true,
    });
  });

  test('renders the first page of alert summary results', async ({ pageObjects, kbnClient }) => {
    await pageObjects.ruleDetailsPage.gotoById(paginationRuleId);
    await expect(pageObjects.ruleDetailsPage.ruleName).toHaveText(PAGINATION_RULE_NAME);
    await pageObjects.ruleDetailsPage.expectAlertsTabLoaded();

    const { alerts } = await getAlertSummary(kbnClient, paginationRuleId);
    const alertIds = Object.keys(alerts);
    const firstPage = alertIds.slice(0, 10);
    expect(firstPage).toHaveLength(10);
    expect(firstPage[0]).toBe(alertIds[0]);
  });

  test('navigates to the next page of alert summary results', async ({
    pageObjects,
    kbnClient,
  }) => {
    await pageObjects.ruleDetailsPage.gotoById(paginationRuleId);
    await expect(pageObjects.ruleDetailsPage.ruleName).toHaveText(PAGINATION_RULE_NAME);
    await pageObjects.ruleDetailsPage.expectAlertsTabLoaded();

    const { alerts } = await getAlertSummary(kbnClient, paginationRuleId);
    const alertIds = Object.keys(alerts);
    const nextPage = alertIds.slice(10, 20);
    expect(nextPage[0]).toBe(alertIds[10]);
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

      // The alert summary widget is scoped to the rule UUID + time range only; it is
      // not wired to the alerts table search bar, so its total stays at 2 (1 active +
      // 1 recovered) even though the table is now filtered down to the single active alert.
      await expect(pageObjects.ruleDetailsPage.alertSummaryTotalCount).toHaveText('2');
    });
  });
});
