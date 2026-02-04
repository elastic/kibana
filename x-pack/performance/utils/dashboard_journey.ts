/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaServer } from '@kbn/ftr-common-functional-services';
import { Journey } from '@kbn/journeys';
import type { KibanaPage } from '@kbn/journeys/services/page/kibana_page';
import { subj } from '@kbn/test-subj-selector';
import type { Page } from 'playwright';

interface DashboardJourneyConfig {
  esArchives: string[];
  kbnArchives: string[];
  dashboardName: string;
  dashboardLinkSubj: string;
  setup?: (kibanaServer: KibanaServer) => Promise<void>;
  visualizationCount?: number;
  loadCompleteAwaiter?: (page: Page, kibanaPage: KibanaPage) => Promise<void>;
}

export function createDashboardJourney(config: DashboardJourneyConfig): Journey<{}> {
  const waitForDashboardLoad = async (page: Page, kibanaPage: KibanaPage) => {
    if (config.visualizationCount) {
      await kibanaPage.waitForVisualizations({ count: config.visualizationCount });
    } else if (config.loadCompleteAwaiter) {
      await config.loadCompleteAwaiter(page, kibanaPage);
    } else {
      throw new Error(
        'Either visualizationCount or loadCompleteAwaiter must be provided in the config'
      );
    }
  };

  const journey = new Journey({
    esArchives: config.esArchives,
    kbnArchives: config.kbnArchives,
  });

  if (config.setup) {
    journey.step('Setup', async ({ kibanaServer }) => {
      await config.setup!(kibanaServer);
    });
  }

  return journey
    .step('Go to Dashboards Page', async ({ page, kbnUrl, kibanaPage }) => {
      await page.goto(kbnUrl.get(`/app/dashboards`));
      await kibanaPage.waitForListViewTable();
    })
    .step(`Go to ${config.dashboardName}`, async ({ page, kibanaPage }) => {
      await page.click(subj(config.dashboardLinkSubj));
      await waitForDashboardLoad(page, kibanaPage);
    })
    .step('Return to listing page', async ({ page, kibanaPage }) => {
      await kibanaPage.backToDashboardListing();
      await kibanaPage.waitForListViewTable();
    })
    .step(`Return to dashboard`, async ({ page, kibanaPage }) => {
      await page.click(subj(config.dashboardLinkSubj));
      await waitForDashboardLoad(page, kibanaPage);
    })
    .step('Refresh dashboard', async ({ page, kibanaPage }) => {
      await page.waitForTimeout(1000); // be sure things are stable
      await page.click(subj('querySubmitButton'));
      await waitForDashboardLoad(page, kibanaPage);
    });
}
