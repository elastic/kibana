/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';

import { test } from '../fixtures';

test.describe('Add integration navigation', { tag: tags.stateful.classic }, () => {
  let nginxPkgkey: string;

  test.beforeAll(async ({ apiServices, kbnClient }) => {
    await apiServices.fleet.internal.setup();

    const response = await kbnClient.request<{ item: { version: string } }>({
      method: 'GET',
      path: '/api/fleet/epm/packages/nginx',
    });

    nginxPkgkey = `nginx-${response.data.item.version}`;
  });

  test('clicking Add integration stays in the Integrations app', async ({
    browserAuth,
    pageObjects,
    page,
  }) => {
    await browserAuth.loginAsPrivilegedUser();

    const { integrationHome } = pageObjects;

    await integrationHome.navigateToDetailPage(nginxPkgkey);
    await integrationHome.waitForDetailPageToLoad();

    await integrationHome.getAddIntegrationPolicyButton().click();

    // URL must be within the Integrations app, not Fleet
    await expect(page).toHaveURL(/\/app\/integrations\//);
    await expect(page).not.toHaveURL(/\/app\/fleet\//);

    // The add integration form must render
    await page.testSubj.waitForSelector('createPackagePolicy_page', {
      state: 'visible',
      timeout: 20_000,
    });
  });

  test('add integration URL path is /detail/:pkgkey/add-integration', async ({
    browserAuth,
    pageObjects,
    page,
  }) => {
    await browserAuth.loginAsPrivilegedUser();

    const { integrationHome } = pageObjects;

    await integrationHome.navigateToDetailPage(nginxPkgkey);
    await integrationHome.waitForDetailPageToLoad();

    await integrationHome.getAddIntegrationPolicyButton().click();

    expect(page.url()).toContain(`/app/integrations/detail/${nginxPkgkey}/add-integration`);
  });
});
