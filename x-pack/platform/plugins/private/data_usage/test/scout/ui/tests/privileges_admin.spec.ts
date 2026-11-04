/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';
import { test } from '../fixtures';

test.describe(
  'Data Usage privileges - admin',
  {
    tag: [
      ...tags.serverless.security.complete,
      ...tags.serverless.observability.complete,
      ...tags.serverless.search,
    ],
  },
  () => {
    test('renders for the admin role', async ({ browserAuth, pageObjects }) => {
      const { dataUsage } = pageObjects;
      await browserAuth.loginAsAdmin();

      await dataUsage.gotoManagement();
      await expect(dataUsage.managementCard).toBeVisible();

      await dataUsage.goto();
      await expect(dataUsage.content).toBeVisible();
    });
  }
);
