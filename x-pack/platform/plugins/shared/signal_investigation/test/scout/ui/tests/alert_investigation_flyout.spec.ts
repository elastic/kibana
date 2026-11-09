/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@elastic/datemath';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  TRACE_CHANGE_POINTS_ANALYSIS_SPIKE_WINDOW,
  TRACE_CHANGE_POINTS_DEPENDENCY_RESOURCE,
  TRACE_CHANGE_POINTS_SERVICE_NAME,
  generateTraceChangePointsData,
} from '@kbn/synthtrace';
import { v4 as uuidv4 } from 'uuid';
import {
  deleteObservabilityAlertDocument,
  indexObservabilityAlertDocument,
  test,
} from '../fixtures';

test.describe(
  'Signal investigation flyout from an Observability alert',
  { tag: tags.stateful.classic },
  () => {
    const alertId = `signal-investigation-alert-${uuidv4()}`;

    test.beforeAll(async ({ esClient, apmSynthtraceEsClient }) => {
      const { generator } = generateTraceChangePointsData({
        apmEsClient: apmSynthtraceEsClient as never,
      });
      await apmSynthtraceEsClient.index(generator);

      const startIso =
        datemath.parse(TRACE_CHANGE_POINTS_ANALYSIS_SPIKE_WINDOW.start)?.toISOString() ??
        new Date(Date.now() - 30 * 60_000).toISOString();
      const endIso =
        datemath.parse(TRACE_CHANGE_POINTS_ANALYSIS_SPIKE_WINDOW.end)?.toISOString() ??
        new Date(Date.now() - 28 * 60_000).toISOString();

      await indexObservabilityAlertDocument(esClient, {
        alertId,
        serviceName: TRACE_CHANGE_POINTS_SERVICE_NAME,
        environment: 'test',
        startIso,
        endIso,
      });
    });

    test.afterAll(async ({ esClient, apmSynthtraceEsClient }) => {
      await deleteObservabilityAlertDocument(esClient, alertId);
      await apmSynthtraceEsClient.clean();
    });

    test('opens the flyout, passes a11y checks, lists the dependency lead, and drills into the dependency view', async ({
      browserAuth,
      page,
      pageObjects,
    }) => {
      const { signalInvestigationFlyout } = pageObjects;

      await test.step('open alert details and launch Find related changes', async () => {
        await browserAuth.loginAsPrivilegedUser();
        await signalInvestigationFlyout.gotoAlertDetails(alertId);
        await signalInvestigationFlyout.openFromAlertDetails();
        await signalInvestigationFlyout.waitForAnalysesComplete();
      });

      await test.step('verify flyout accessibility and accordion states', async () => {
        await expect(page.getByRole('dialog', { name: 'Find related changes' })).toBeVisible();
        await expect(signalInvestigationFlyout.leadsAccordionButton).toHaveAttribute(
          'aria-expanded',
          'true'
        );
        await expect(signalInvestigationFlyout.coverageAccordionButton).toHaveAttribute(
          'aria-expanded',
          'false'
        );

        const { violations } = await page.checkA11y({
          include: ['[data-test-subj="signalInvestigationFlyout"]'],
        });
        expect(violations).toStrictEqual([]);
      });

      await test.step('verify dependency lead, coverage line, and drilldown', async () => {
        const dependencyLeadLink = signalInvestigationFlyout.leadLinkWithText(
          TRACE_CHANGE_POINTS_DEPENDENCY_RESOURCE
        );
        await expect(dependencyLeadLink).toBeVisible();

        await signalInvestigationFlyout.openCoverageAccordion();
        const dependencyCoverage = signalInvestigationFlyout.coverageItem(
          'dependency_change_points'
        );
        await expect(dependencyCoverage).toContainText('Change point detection');
        await expect(dependencyCoverage).toContainText('found');

        await dependencyLeadLink.click();
        await expect(signalInvestigationFlyout.leadPreviewFlyout).toBeVisible();
        await expect(signalInvestigationFlyout.leadDrilldownLink).toContainText('Open in APM');
        await expect(signalInvestigationFlyout.leadDrilldownLink).toHaveAttribute(
          'href',
          /\/app\/apm\/dependencies\//
        );
        await expect(signalInvestigationFlyout.leadDrilldownLink).toHaveAttribute(
          'target',
          '_blank'
        );
      });
    });
  }
);
