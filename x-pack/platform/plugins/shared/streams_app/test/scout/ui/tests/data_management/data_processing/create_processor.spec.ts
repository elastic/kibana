/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable playwright/expect-expect */

import { expect } from '@kbn/scout';
import { test } from '../../../fixtures';

test.describe.only(
  'Stream data processing - creating processing rules',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    test.beforeAll(async ({ apiServices }) => {
      await apiServices.streams.enable();
      await apiServices.streams.clearStreamChildren('logs');
      // Create a child test stream test processing
      await apiServices.streams.forkStream('logs', 'logs.child', {
        field: 'service.name',
        value: 'test-service',
        operator: 'eq',
      });
    });

    test.beforeEach(async ({ apiServices, browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      // Clear existing processors before each test
      await apiServices.streams.clearStreamProcessors('logs.child');

      await pageObjects.streams.gotoProcessingTab('logs.child');
    });

    test.afterAll(async ({ apiServices }) => {
      await apiServices.streams.disable();
    });

    test('should create a new processor successfully', async ({ pageObjects }) => {
      await pageObjects.streams.clickAddProcessor();

      await pageObjects.streams.fillFieldInput('body.text');
      await pageObjects.streams.fillGrokPatternInput('%{WORD:attributes.method}');
      await pageObjects.streams.clickCreateProcessor();
      await pageObjects.streams.saveProcessorsListChanges();
    });

    test('should not let creating new processors while one is in progress', async ({
      page,
      pageObjects,
    }) => {
      await pageObjects.streams.clickAddProcessor();

      await expect(
        page.getByTestId('streamsAppStreamDetailEnrichmentAddProcessorButton')
      ).toBeDisabled();

      // Cancel the operation
      await pageObjects.streams.clickCancelProcessorChanges();

      // Verify we're back to idle state
      await expect(
        page.getByTestId('streamsAppStreamDetailEnrichmentAddProcessorButton')
      ).toBeEnabled();
    });

    test('should cancel creating a new processor', async ({ page, pageObjects }) => {
      await pageObjects.streams.clickAddProcessor();

      // Fill in some data
      await pageObjects.streams.fillFieldInput('body.text');
      await pageObjects.streams.fillGrokPatternInput('%{WORD:attributes.method}');

      // Cancel the changes and confirm discard
      await pageObjects.streams.clickCancelProcessorChanges();
      await pageObjects.streams.confirmDiscardInModal();

      // Verify we're back to idle state
      await expect(page.getByTestId('streamsAppRoutingStreamEntryNameField')).toBeHidden();
    });

    test('should show validation errors for invalid processors configuration', async ({
      page,
      pageObjects,
    }) => {
      await pageObjects.streams.clickAddProcessor();

      // Try to create without filling required fields
      await pageObjects.streams.clickCreateProcessor();
      await expect(page.getByText('A field value is required.')).toBeVisible();

      await pageObjects.streams.fillFieldInput('body.text');
      await pageObjects.streams.clickCreateProcessor();
      await expect(page.getByText('Empty patterns are not allowed.')).toBeVisible();

      await pageObjects.streams.fillGrokPatternInput('%{WORD:attributes.method}');
      await pageObjects.streams.clickCreateProcessor();

      await pageObjects.streams.saveProcessorsListChanges();
    });

    test('should handle insufficient privileges gracefully', async ({
      page,
      browserAuth,
      pageObjects,
    }) => {
      // Login as user with limited privileges
      await browserAuth.loginAsViewer();
      await pageObjects.streams.gotoProcessingTab('logs.child');

      // Create button should be disabled or show tooltip
      const createButton = page.getByTestId('streamsAppStreamDetailEnrichmentAddProcessorButton');
      await expect(createButton).toBeHidden();
    });
  }
);
