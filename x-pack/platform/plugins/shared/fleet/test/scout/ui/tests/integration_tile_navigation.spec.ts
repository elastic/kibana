/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeRegExp } from 'lodash';
import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';

import { test } from '../fixtures';
import { getFleetAllIntegrationsReadRole } from '../fixtures/services/privileges';

test.describe('Integration tile navigation', { tag: tags.stateful.classic }, () => {
  // Renders as its own tile everywhere the suite runs: not part of an integration collection, and
  // no `fips_compatible: false` policy template, so FIPS mode keeps it in the catalog.
  const pkgName = 'activemq';
  let pkgkey: string;

  test.beforeAll(async ({ apiServices }) => {
    await apiServices.fleet.internal.setup();

    const response = await apiServices.fleet.integration.getPackage(pkgName);

    pkgkey = `${pkgName}-${response.data.item.version}`;
  });

  test('clicking a tile with data streams opens the add-integration page', async ({
    browserAuth,
    pageObjects,
    page,
  }) => {
    await browserAuth.loginAsPrivilegedUser();

    const { integrationHome } = pageObjects;

    await integrationHome.navigateTo();
    await integrationHome.waitForPageToLoad();
    await integrationHome.searchForIntegration(pkgName);
    await integrationHome.clickIntegrationCard(pkgName);

    await expect(page).toHaveURL(
      new RegExp(`/app/integrations/detail/${escapeRegExp(pkgkey)}/add-integration`)
    );
  });

  test('clicking a tile as a user without integrations write privileges opens the overview page', async ({
    browserAuth,
    pageObjects,
    page,
  }) => {
    await browserAuth.loginWithCustomRole(getFleetAllIntegrationsReadRole());

    const { integrationHome } = pageObjects;

    await integrationHome.navigateTo();
    await integrationHome.waitForPageToLoad();
    await integrationHome.searchForIntegration(pkgName);
    await integrationHome.clickIntegrationCard(pkgName);

    await expect(page).toHaveURL(
      new RegExp(`/app/integrations/detail/${escapeRegExp(pkgkey)}/overview`)
    );
  });
});
