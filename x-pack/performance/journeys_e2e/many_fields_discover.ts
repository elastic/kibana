/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Journey } from '@kbn/journeys';
import { subj } from '@kbn/test-subj-selector';

export const journey = new Journey({
  kbnArchives: ['test/functional/fixtures/kbn_archiver/many_fields_data_view'],
  esArchives: ['test/functional/fixtures/es_archiver/many_fields'],
})
  .step('Go to Discover Page', async ({ page, kbnUrl, kibanaPage }) => {
    await page.goto(
      kbnUrl.get(
        `/app/discover#/?_g=(filters:!(),refreshInterval:(pause:!t,value:60000),time:(from:now-15m,to:now))&_a=(columns:!(),filters:!(),index:'35796250-bb09-11ec-a8e4-a9868e049a39',interval:auto,query:(language:kuery,query:''),sort:!())`
      )
    );
    await kibanaPage.waitForHeader();
    await page.waitForSelector('[data-test-subj="discoverDocTable"][data-render-complete="true"]');
    await page.waitForSelector(subj('globalLoadingIndicator-hidden'));
  })
  .step('Expand a document', async ({ page }) => {
    const expandButtons = page.locator(subj('docTableExpandToggleColumn'));
    await expandButtons.nth(3).click();
    await page.waitForSelector(subj('docTableRowAction'));
    await page.click(subj('docTableRowAction'));
    await page.waitForSelector(subj('globalLoadingIndicator-hidden'));
  });
