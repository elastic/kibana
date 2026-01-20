/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';

import { test } from '../fixtures';

test.describe('Lens page', { tag: ['@ess'] }, () => {
  test.beforeEach(async ({ pageObjects, browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.lens.navigateTo();
  });

  test('should display the Lens page', async ({ pageObjects }) => {
    const { lens } = pageObjects;
    await expect(lens.getLensApp()).toBeVisible();
  });
});
