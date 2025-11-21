/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test } from '../../../fixtures';
import {
  openRetentionModal,
  saveRetentionChanges,
  toggleInheritSwitch,
  verifyValidationError,
  verifySaveButtonState,
  INVALID_RETENTION_VALUES,
  VALIDATION_ERRORS,
  RETENTION_TEST_IDS,
} from '../../../fixtures/retention_helpers';

test.describe('Stream data retention - validation', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeAll(async ({ apiServices }) => {
    await apiServices.streams.enable();
  });

  test.beforeEach(async ({ apiServices, browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await apiServices.streams.clearStreamChildren('logs');
    await apiServices.streams.forkStream('logs', 'logs.nginx', {
      field: 'service.name',
      eq: 'nginx',
    });
    await pageObjects.streams.gotoDataRetentionTab('logs.nginx');
  });

  test.afterEach(async ({ apiServices, pageObjects }) => {
    await pageObjects.toasts.closeAll();
    await apiServices.streams.clearStreamChildren('logs');
  });

  test.afterAll(async ({ apiServices }) => {
    await apiServices.streams.disable();
  });

  test('should show error for empty retention value', async ({ page }) => {
    await openRetentionModal(page);
    await toggleInheritSwitch(page, false);
    await page.getByRole('button', { name: 'Custom period' }).click();
    await page.getByTestId(RETENTION_TEST_IDS.dslField).fill(INVALID_RETENTION_VALUES.empty);
    await verifySaveButtonState(page, false);
  });

  test('should show error for negative and non-numeric values', async ({ page }) => {
    await openRetentionModal(page);
    await toggleInheritSwitch(page, false);
    await page.getByRole('button', { name: 'Custom period' }).click();

    // Negative value
    await page.getByTestId(RETENTION_TEST_IDS.dslField).fill(INVALID_RETENTION_VALUES.negative);
    await verifyValidationError(page, VALIDATION_ERRORS.positiveInteger);
    await verifySaveButtonState(page, false);

    // Non-numeric
    await page.getByTestId(RETENTION_TEST_IDS.dslField).fill(INVALID_RETENTION_VALUES.nonNumeric);
    await verifyValidationError(page, VALIDATION_ERRORS.positiveInteger);
    await verifySaveButtonState(page, false);
  });

  test('should clear validation error when fixed and enable save', async ({ page }) => {
    await openRetentionModal(page);
    await toggleInheritSwitch(page, false);
    await page.getByRole('button', { name: 'Custom period' }).click();

    // Enter invalid value
    await page.getByTestId(RETENTION_TEST_IDS.dslField).fill(INVALID_RETENTION_VALUES.negative);
    await verifyValidationError(page, VALIDATION_ERRORS.positiveInteger);

    // Fix the value
    await page.getByTestId(RETENTION_TEST_IDS.dslField).fill('7');
    await verifySaveButtonState(page, true);
  });

  test('should not validate in inherit mode', async ({ page }) => {
    await openRetentionModal(page);
    // With inherit mode enabled, save should work regardless of custom field value
    await verifySaveButtonState(page, true);
    await saveRetentionChanges(page);
  });

  test('should validate after switching from inherit to custom', async ({ page }) => {
    await openRetentionModal(page);
    await toggleInheritSwitch(page, false);
    await page.getByRole('button', { name: 'Custom period' }).click();
    // Empty field should disable save
    await verifySaveButtonState(page, false);
  });

  test('should validate on unit change with invalid value', async ({ page }) => {
    await openRetentionModal(page);
    await toggleInheritSwitch(page, false);
    await page.getByRole('button', { name: 'Custom period' }).click();
    await page.getByTestId(RETENTION_TEST_IDS.dslField).fill(INVALID_RETENTION_VALUES.negative);
    await verifyValidationError(page, VALIDATION_ERRORS.positiveInteger);

    // Change unit - should still show error
    await page.getByTestId(RETENTION_TEST_IDS.dslUnitButton).click();
    await page.getByTestId(RETENTION_TEST_IDS.dslUnitOption('h')).click();
    await verifySaveButtonState(page, false);
  });
});
