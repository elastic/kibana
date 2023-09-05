/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Journey } from '@kbn/journeys';
import { subj } from '@kbn/test-subj-selector';

export const journey = new Journey({
  kbnArchives: ['x-pack/performance/kbn_archives/lens_many_fields'],
  esArchives: ['test/functional/fixtures/es_archiver/stress_test'],
})
  .step('Go to Visualize Library landing page', async ({ page, kbnUrl }) => {
    await page.goto(
      kbnUrl.get(
        `/app/visualize#/?_g=(filters:!(),time:(from:'2022-09-07T10:53:30.262Z',to:'2022-09-07T10:55:09.280Z'))`
      )
    );
    await page.waitForSelector(subj('table-is-ready'));
    // wait extra 5 seconds: we're not sure why, but the extra sleep before loading the editor makes the metrics more consistent
    await page.waitForTimeout(5000);
  })
  .step('Open existing Lens visualization', async ({ page, kibanaPage }) => {
    await page.click(subj('visListingTitleLink-Lens-Stress-Test'));
    await kibanaPage.waitForCharts(6);
  });
