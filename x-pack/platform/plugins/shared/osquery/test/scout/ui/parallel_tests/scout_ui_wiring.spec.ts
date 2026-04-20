/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';
import { uiTest as test } from '../fixtures';

const wiringTags = [...tags.stateful.classic, ...tags.serverless.security.complete];

test.describe('Osquery Scout UI wiring', { tag: wiringTags }, () => {
  test('loads the new live query page', async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.osqueryNavigation.gotoNewLiveQuery();
    await expect(pageObjects.osqueryLiveQueryForm.submitButton).toBeVisible();
  });
});
