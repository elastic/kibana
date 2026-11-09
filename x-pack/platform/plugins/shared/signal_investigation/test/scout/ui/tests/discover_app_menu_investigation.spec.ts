/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  LOG_RATE_ANALYSIS_SPIKE_DEVIATION_WINDOW,
  generateLogRateAnalysisSpikeData,
} from '@kbn/synthtrace';
import { v4 as uuidv4 } from 'uuid';
import { test } from '../fixtures';

const DISCOVER_READY_TIMEOUT_MS = 45_000;

test.describe(
  'Signal investigation from the Discover app menu on a logs data view',
  { tag: tags.stateful.classic },
  () => {
    const runId = uuidv4();
    const spaceId = `sig-inv-oblt-${runId.slice(0, 8)}`;
    const dataViewId = `sig-inv-discover-dv-${runId}`;

    test.beforeAll(async ({ apiServices, logsSynthtraceEsClient }) => {
      const { generator } = generateLogRateAnalysisSpikeData({
        logsEsClient: logsSynthtraceEsClient as never,
      });
      await logsSynthtraceEsClient.index(generator);

      await apiServices.spaces.create({
        id: spaceId,
        name: `Signal Investigation ${runId.slice(0, 8)}`,
      });
      await apiServices.spaces.setSolutionView({
        id: spaceId,
        solution: 'oblt',
      });

      await apiServices.dataViews.create({
        id: dataViewId,
        title: 'logs-payments.api-*',
        name: `Payments logs ${runId}`,
        timeFieldName: '@timestamp',
        spaceId,
        override: true,
      });
    });

    test.afterAll(async ({ apiServices, logsSynthtraceEsClient }) => {
      await apiServices.spaces.delete(spaceId).catch(() => {});
      await logsSynthtraceEsClient.clean();
    });

    test('shows log rate analysis in coverage and links to the Log Rate Analysis page', async ({
      browserAuth,
      page,
      pageObjects,
    }) => {
      const { appMenu, signalInvestigationFlyout } = pageObjects;
      const discoverUrl =
        `/s/${spaceId}/app/discover#/?` +
        `_g=(time:(from:'${LOG_RATE_ANALYSIS_SPIKE_DEVIATION_WINDOW.start}',to:'${LOG_RATE_ANALYSIS_SPIKE_DEVIATION_WINDOW.end}'))` +
        `&_a=(dataSource:(dataViewId:'${dataViewId}',type:dataView))`;

      await test.step('open Discover in the Observability space and run Find related changes', async () => {
        await browserAuth.loginAsPrivilegedUser();
        await page.goto(discoverUrl, { waitUntil: 'commit' });
        await page.testSubj.locator('dscPage').waitFor({
          state: 'visible',
          timeout: DISCOVER_READY_TIMEOUT_MS,
        });
        await appMenu.clickItem('discoverAppMenuFindRelatedChanges');
        await signalInvestigationFlyout.waitForAnalysesComplete();
      });

      await test.step('open Analysis coverage and verify the Log Rate Analysis link', async () => {
        await signalInvestigationFlyout.openCoverageAccordion();
        const logRateCoverage = signalInvestigationFlyout.coverageItem('log_rate_analysis');
        await expect(logRateCoverage).toContainText('Log rate analysis');

        const logRateLink = signalInvestigationFlyout.coverageLink('log_rate_analysis');
        await expect(logRateLink).toBeVisible();
        await expect(logRateLink).toHaveAttribute('href', /\/app\/ml\/aiops\/log_rate_analysis/);
        await expect(logRateLink).toHaveAttribute('target', '_blank');
      });
    });
  }
);
