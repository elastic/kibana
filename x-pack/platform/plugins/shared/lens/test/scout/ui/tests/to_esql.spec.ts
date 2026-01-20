/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';

import { test } from '../fixtures';

test.describe('Lens ES|QL', { tag: ['@ess'] }, () => {
  test.beforeAll(async ({ kbnClient }) => {
    await kbnClient.importExport.load(
      'x-pack/platform/test/functional/fixtures/kbn_archives/reporting/ecommerce.json'
    );
  });

  test('should show switch to query mode button', async ({ browserAuth, page, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await page.gotoApp('dashboards');
    await page.getByTestId('dashboardListingTitleLink-Ecom-Dashboard').click();
  });
});
