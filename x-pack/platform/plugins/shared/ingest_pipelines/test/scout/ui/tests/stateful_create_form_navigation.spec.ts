/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

test.describe(
  'Ingest pipelines stateful create form navigation',
  { tag: tags.stateful.classic },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsIngestPipelinesUser();
      await pageObjects.ingestPipelines.goto();
    });

    test('shows a prompt when trying to navigate away from a dirty creation form', async ({
      pageObjects,
    }) => {
      await pageObjects.ingestPipelines.dirtyCreateFormAndClickLogo();

      await expect(pageObjects.ingestPipelines.navigationBlockConfirmModal).toBeVisible();
    });
  }
);
