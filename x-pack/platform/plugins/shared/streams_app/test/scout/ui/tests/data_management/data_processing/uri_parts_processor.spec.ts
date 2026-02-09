/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { test } from '../../../fixtures';
import { generateLogsData } from '../../../fixtures/generators';

test.describe('Stream data processing - uri_parts processor', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeAll(async ({ logsSynthtraceEsClient }) => {
    await generateLogsData(logsSynthtraceEsClient)({ index: 'logs-generic-default' });
  });

  test.beforeEach(async ({ apiServices, browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await apiServices.streams.clearStreamProcessors('logs-generic-default');
    await pageObjects.streams.gotoProcessingTab('logs-generic-default');
  });

  test.afterAll(async ({ apiServices, logsSynthtraceEsClient }) => {
    await apiServices.streams.clearStreamProcessors('logs-generic-default');
    await logsSynthtraceEsClient.clean();
  });

  test('should create a uri_parts processor successfully', async ({ page, pageObjects }) => {
    await pageObjects.streams.clickAddProcessor();

    await pageObjects.streams.selectProcessorType('URI parts');
    await pageObjects.streams.fillProcessorFieldInput('message');

    await page.getByTestId('streamsAppUriPartsTargetFieldInput').fill('url');
    await page.getByRole('button', { name: 'Advanced settings' }).click();

    // Ensure the advanced toggles are present and can be interacted with
    await page.getByLabel('Keep original').click();
    await page.getByLabel('Remove source field if successful').click();

    await pageObjects.streams.clickSaveProcessor();
    await pageObjects.streams.saveStepsListChanges();

    expect(await pageObjects.streams.getProcessorsListItems()).toHaveLength(1);
  });
});

