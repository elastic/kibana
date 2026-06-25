/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';

import { test } from '../fixtures';
import { getFleetAllIntegrationsNoneRole } from '../fixtures/services/privileges';

test.describe(
  'When the user has All privilege for Fleet but None for integrations',
  { tag: '@local-stateful-classic' },
  () => {
    test('Fleet is accessible', async ({ browserAuth, pageObjects }) => {
      // custom roles are not supported in ECH yet: https://github.com/elastic/appex-qa-team/issues/713
      // Login with custom role: Fleet v2 (all) but Fleet (none) - which means integrations are none
      await browserAuth.loginWithCustomRole(getFleetAllIntegrationsNoneRole());
      const { fleetHome } = pageObjects;

      await fleetHome.navigateTo();
      await fleetHome.waitForPageToLoad();

      await expect(fleetHome.getMissingPrivilegesPromptTitle()).toHaveCount(0);
    });
  }
);
