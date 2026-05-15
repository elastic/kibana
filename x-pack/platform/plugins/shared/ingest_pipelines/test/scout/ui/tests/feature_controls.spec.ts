/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

test.describe('Ingest pipelines feature controls', { tag: tags.stateful.classic }, () => {
  test('ingest user with dev tools has the embedded console', async ({
    browserAuth,
    page,
    pageObjects,
  }) => {
    await browserAuth.loginAsDevToolsReadWithIngest();
    await pageObjects.ingestPipelines.goto();

    const controlBar = page.testSubj.locator('consoleEmbeddedControlBar');
    const body = page.testSubj.locator('consoleEmbeddedBody');

    await expect(controlBar).toBeVisible();
    await expect(body).toBeHidden();

    await controlBar.click();
    await expect(body).toBeVisible();

    await controlBar.click();
    await expect(body).toBeHidden();
  });
});
