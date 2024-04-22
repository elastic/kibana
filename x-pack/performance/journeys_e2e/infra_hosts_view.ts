/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Journey } from '@kbn/journeys';
import { subj } from '@kbn/test-subj-selector';
import { generateHostsData } from '../synthtrace_data/hosts_data';

export const journey = new Journey({
  synthtrace: {
    type: 'infra',
    generator: generateHostsData,
    options: {
      from: new Date(Date.now() - 1000 * 60 * 10),
      to: new Date(),
      count: 1000,
    },
  },
})
  .step('Navigate to Hosts view and load 500 hosts', async ({ page, kbnUrl, kibanaPage }) => {
    await page.goto(
      kbnUrl.get(
        `app/metrics/hosts?_a=(dateRange:(from:now-15m,to:now),filters:!(),limit:500,panelFilters:!(),query:(language:kuery,query:''))`
      )
    );
    // wait for table to be loaded
    await page.waitForSelector(subj('hostsView-table-loaded'));
    // wait for metric charts to be loaded
    await kibanaPage.waitForCharts({
      parentLocator: subj('hostsViewKPIGrid'),
      count: 5,
      timeout: 60000,
    });
  })
  .step('Go to single host asset details view', async ({ page, kibanaPage }) => {
    // get the links to asset details page
    const hostsTableLinks = await page.locator(subj('hostsViewTableEntryTitleLink'));
    // click on the first host in the table to see asset details
    await hostsTableLinks.first().click();
    // wait for metric charts on the asset details view to be loaded
    await kibanaPage.waitForCharts({
      parentLocator: subj('infraAssetDetailsKPIGrid'),
      count: 4,
      timeout: 60000,
    });
  });
