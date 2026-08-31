/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';

import { test } from '../fixtures';
import { getFleetNoneIntegrationsAllRole } from '../fixtures/services/privileges';

test.describe(
  'When the user has All privileges for Integrations but None for Fleet',
  { tag: tags.stateful.classic },
  () => {
    test('Integrations are visible but cannot be added', async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginWithCustomRole(getFleetNoneIntegrationsAllRole());
      const { integrationHome } = pageObjects;

      // Apache is now grouped into a collection tile, so navigate directly to its detail
      // page instead of browsing and clicking through the collection.
      await integrationHome.navigateToDetailPage('apache');

      // Verify the Add Integration button is disabled
      await expect(integrationHome.getAddIntegrationPolicyButton()).toBeDisabled();
    });
  }
);
