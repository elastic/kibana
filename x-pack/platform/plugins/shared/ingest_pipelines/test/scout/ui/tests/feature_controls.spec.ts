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
    pageObjects,
  }) => {
    await browserAuth.loginAsDevToolsReadWithIngest();
    await pageObjects.ingestPipelines.goto();

    const { embeddedConsole } = pageObjects;

    await expect(embeddedConsole.controlBar).toBeVisible();
    await expect(embeddedConsole.body).toBeHidden();

    await embeddedConsole.toggle();
    await expect(embeddedConsole.body).toBeVisible();
    await expect(embeddedConsole.fullscreenToggle).toBeVisible();

    await embeddedConsole.toggle();
    await expect(embeddedConsole.body).toBeHidden();
  });
});
