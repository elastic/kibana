/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

test.describe('global pages', { tag: tags.stateful.classic }, () => {
  test('displays the global banner on the login page', async ({ pageObjects }) => {
    await pageObjects.login.goto();

    await expect(pageObjects.banners.mainWrapper).toBeVisible();
    expect(await pageObjects.banners.getTopBannerText()).toBe('global banner text');
  });
});
