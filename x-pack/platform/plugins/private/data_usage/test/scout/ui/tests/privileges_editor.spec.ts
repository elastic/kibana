/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';
import { test } from '../fixtures';

// The editor role does not exist in search projects
test.describe(
  'Data Usage privileges - editor',
  { tag: [...tags.serverless.security.complete, ...tags.serverless.observability.complete] },
  () => {
    test('does not render for the editor role', async ({ browserAuth, pageObjects }) => {
      const { dataUsage } = pageObjects;
      await browserAuth.loginAs('editor');

      await dataUsage.gotoManagement();
      await expect(dataUsage.managementCard).toBeHidden();

      await dataUsage.goto();
      await expect(dataUsage.managementCards).toBeVisible();
      await expect(dataUsage.content).toBeHidden();
    });
  }
);
