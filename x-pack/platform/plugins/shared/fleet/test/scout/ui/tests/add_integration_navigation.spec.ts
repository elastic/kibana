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

  test.beforeAll(async ({ apiServices }) => {
    await apiServices.fleet.internal.setup();

    const response = await apiServices.fleet.integration.getPackage('nginx');

    nginxPkgkey = `nginx-${response.data.item.version}`;
  });

  test('clicking Add integration navigates to the add-integration page within Integrations app', async ({
    browserAuth,
    pageObjects,
    page,
  }) => {
    await browserAuth.loginAsPrivilegedUser();

    const { integrationHome } = pageObjects;

    await integrationHome.navigateToDetailPage(nginxPkgkey);

    await integrationHome.getAddIntegrationPolicyButton().click();

    // URL must be within the Integrations app at /detail/:pkgkey/add-integration
    await expect(page).toHaveURL(
      new RegExp(`/app/integrations/detail/${nginxPkgkey}/add-integration`)
    );
    await expect(page).not.toHaveURL(/\/app\/fleet\//);
  });
});
