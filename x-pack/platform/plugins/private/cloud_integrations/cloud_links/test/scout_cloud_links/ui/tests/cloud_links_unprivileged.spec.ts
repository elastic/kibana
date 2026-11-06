/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

test.describe('Cloud Links integration: Unprivileged User', { tag: tags.stateful.classic }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.home.goto();
  });

  test('viewer sees nav and org/profile links but not billing', async ({ pageObjects }) => {
    const { cloudLinks } = pageObjects;

    await test.step('"Manage this deployment" link is visible', async () => {
      await cloudLinks.openNav();
      expect(await cloudLinks.isManageDeploymentLinkVisible()).toBe(true);
    });

    await test.step('user menu shows Profile and Organization but hides Billing', async () => {
      await cloudLinks.openUserMenu();
      expect(await cloudLinks.isProfileLinkVisible()).toBe(true);
      expect(await cloudLinks.isOrganizationLinkVisible()).toBe(true);
      expect(await cloudLinks.isBillingLinkVisible()).toBe(false);
    });

    await test.step('Appearance button is visible for viewers', async () => {
      // Menu should already be open from the previous step
      expect(await cloudLinks.isAppearanceButtonVisible()).toBe(true);
    });
  });
});
