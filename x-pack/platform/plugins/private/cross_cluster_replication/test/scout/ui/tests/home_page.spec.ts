/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';
import { CCR_TAGS, CCR_ROLE } from '../fixtures/constants';

test.describe('Cross-Cluster Replication - Home Page', { tag: CCR_TAGS }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginWithCustomRole(CCR_ROLE);
    await pageObjects.ccr.goto();
  });

  test('loads the app and displays the create follower index button', async ({ pageObjects }) => {
    await expect(pageObjects.ccr.appTitle).toHaveText('Cross-Cluster Replication');
    await expect(pageObjects.ccr.createFollowerIndexButton).toBeVisible();
  });
});
