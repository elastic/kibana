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
  'Data Usage privileges - viewer',
  {
    tag: [
      ...tags.serverless.security.complete,
      ...tags.serverless.observability.complete,
      ...tags.serverless.search,
    ],
  },
  () => {
    test('does not render for the viewer role', async ({ browserAuth, pageObjects }) => {
      const { dataUsage } = pageObjects;
      await browserAuth.loginAsViewer();

      await dataUsage.gotoManagement();
      await expect(dataUsage.managementCard).toBeHidden();

      await dataUsage.goto();
      await expect(dataUsage.managementCards).toBeVisible();
      await expect(dataUsage.content).toBeHidden();
    });
  }
);
