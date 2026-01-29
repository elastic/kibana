/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type Locator, type ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

/**
 * Wait for an element to be visible and enabled (not disabled)
 */
async function waitForElementToBeEnabled(page: ScoutPage, testSubj: string): Promise<void> {
  const element = page.getByTestId(testSubj);
  await element.waitFor({ state: 'visible' });
  await page.waitForFunction((selector) => {
    const el = document.querySelector(`[data-test-subj="${selector}"]`);
    return el && !el.hasAttribute('disabled');
  }, testSubj);
}

// Test IDs constants for retention UI elements
export const RETENTION_TEST_IDS = {
  // Buttons and controls
  editButton: 'streamsAppRetentionMetadataEditDataRetentionButton',
  editFailureStoreButton: 'streamsAppFailureStoreRetentionMetadataEditDataRetentionButton',
  inheritSwitch: 'inheritDataRetentionSwitch',
  buttonGroup: 'dataRetentionButtonGroup',
  indefiniteButton: 'indefiniteRetentionButton',
  customButton: 'customRetentionButton',
  ilmButton: 'ilmRetentionButton',
  cancelButton: 'streamsAppModalFooterCancelButton',
  saveButton: 'streamsAppModalFooterButton',

  // Modal elements
  modal: 'editLifecycleModalTitle',
  modalCloseButton: 'euiModalCloseButton',
  inheritHeading: 'inheritRetentionHeading',
  customHeading: 'customRetentionHeading',

  // DSL fields
  dslField: 'streamsAppDslModalDaysField',
  dslUnitButton: 'streamsAppDslModalButton',
  dslUnitOption: (unit: 'd' | 'h' | 'm' | 's') => `streamsAppDslModalUnitOption-${unit}`,

  // Display elements
  retentionMetric: 'retention-metric',
  retentionCard: 'retentionCard',
  failureStoreRetentionCard: 'failureStoreRetentionCard',
  retentionColumn: (streamName: string) => `retentionColumn-${streamName}`,
  lifecycleBadge: 'lifecycleBadge',

  // ILM elements (ESS only)
  ilmPolicyDropdown: 'ilmPolicyDropdown',
  ilmPolicyOption: (policyName: string) => `ilmPolicyOption-${policyName}`,
  ilmLink: 'ilmPolicyLink',
} as const;

// Mock retention values for testing
export const MOCK_RETENTION_VALUES = {
  sevenDays: { value: '7', unit: 'd' as const, display: '7 days' },
  oneDay: { value: '1', unit: 'd' as const, display: '1 day' },
  twentyFourHours: { value: '24', unit: 'h' as const, display: '24 hours' },
  oneHour: { value: '1', unit: 'h' as const, display: '1 hour' },
  sixtyMinutes: { value: '60', unit: 'm' as const, display: '60 minutes' },
  oneMinute: { value: '1', unit: 'm' as const, display: '1 minute' },
  threeThousandSixHundredSeconds: {
    value: '3600',
    unit: 's' as const,
    display: '3600 seconds',
  },
  oneSecond: { value: '1', unit: 's' as const, display: '1 second' },
  thirtyDays: { value: '30', unit: 'd' as const, display: '30 days' },
  ninetyDays: { value: '90', unit: 'd' as const, display: '90 days' },
  oneYear: { value: '365', unit: 'd' as const, display: '365 days' },
  tenThousandDays: { value: '10000', unit: 'd' as const, display: '10000 days' },
} as const;

// Invalid values for validation testing
export const INVALID_RETENTION_VALUES = {
  negative: '-5',
  decimal: '7.5',
  zero: '0',
  nonNumeric: 'abc',
  empty: '',
  specialChars: '7!@#',
} as const;

// Expected error messages
export const VALIDATION_ERRORS = {
  positiveInteger: 'A positive integer is required',
} as const;

// Badge text constants
export const BADGE_TEXT = {
  inheritFromParent: 'Inherit from parent',
  overrideParent: 'Override parent',
  inheritFromIndexTemplate: 'Inherit from index template',
  overrideIndexTemplate: 'Override index template',
  customPeriod: 'Custom period',
  ilmPolicy: 'ILM policy',
  indefinite: 'Indefinite',
} as const;

/**
 * Opens the retention modal by clicking the edit button
 */
export async function openRetentionModal(
  page: ScoutPage,
  isFailureStore = false
): Promise<Locator> {
  const buttonTestId = isFailureStore
    ? RETENTION_TEST_IDS.editFailureStoreButton
    : RETENTION_TEST_IDS.editButton;
  await page.getByTestId(buttonTestId).click();
  const modal = page.getByTestId(RETENTION_TEST_IDS.modal);
  await expect(modal).toBeVisible();
  return modal;
}

/**
 * Closes the retention modal using specified method
 */
export async function closeRetentionModal(
  page: ScoutPage,
  method: 'cancel' | 'escape' | 'x' = 'cancel'
): Promise<void> {
  switch (method) {
    case 'cancel':
      await page.getByTestId(RETENTION_TEST_IDS.cancelButton).click();
      break;
    case 'escape':
      await page.keyboard.press('Escape');
      break;
    case 'x':
      await page.getByTestId(RETENTION_TEST_IDS.modalCloseButton).click();
      break;
  }
  await expect(page.getByTestId(RETENTION_TEST_IDS.modal)).toBeHidden();
}

/**
 * Saves retention changes by clicking the save button
 */
export async function saveRetentionChanges(page: ScoutPage): Promise<void> {
  await page.getByTestId(RETENTION_TEST_IDS.saveButton).click();
  await expect(page.getByTestId(RETENTION_TEST_IDS.modal)).toBeHidden();
}

/**
 * Sets custom DSL retention with specified value and unit
 */
export async function setCustomRetention(
  page: ScoutPage,
  value: string,
  unit: 'd' | 'h' | 'm' | 's' = 'd'
): Promise<void> {
  // Click custom retention button
  await page.getByRole('button', { name: 'Custom period' }).click();

  // Clear and fill in the value (clear is needed because the field has a default value of 90)
  const field = page.getByTestId(RETENTION_TEST_IDS.dslField);
  await field.clear();
  await field.fill(value);

  // Select the unit if not days (days is default)
  if (unit !== 'd') {
    await page.getByTestId(RETENTION_TEST_IDS.dslUnitButton).click();
    await page.getByTestId(RETENTION_TEST_IDS.dslUnitOption(unit)).click();
  }
}

/**
 * Sets indefinite (unlimited) retention
 */
export async function setIndefiniteRetention(page: ScoutPage): Promise<void> {
  await page.getByRole('button', { name: 'Indefinite' }).click();
}

/**
 * Selects an ILM policy (ESS only)
 */
export async function selectIlmPolicy(page: ScoutPage, policyName: string): Promise<void> {
  await page.getByRole('button', { name: 'ILM policy' }).click();
  await page.getByTestId(RETENTION_TEST_IDS.ilmPolicyDropdown).click();
  await page.getByTestId(RETENTION_TEST_IDS.ilmPolicyOption(policyName)).click();
}

/**
 * Toggles the inherit switch
 */
export async function toggleInheritSwitch(page: ScoutPage, enabled: boolean): Promise<void> {
  const inheritSwitch = page.getByTestId(RETENTION_TEST_IDS.inheritSwitch);
  const isChecked = await inheritSwitch.isChecked();

  if (isChecked !== enabled) {
    await inheritSwitch.click();
  }

  if (enabled) {
    await expect(inheritSwitch).toBeChecked();
  } else {
    await expect(inheritSwitch).not.toBeChecked();
  }
}

/**
 * Verifies the displayed retention value
 */
export async function verifyRetentionDisplay(
  page: ScoutPage,
  expectedValue: string,
  isFailureStore = false
): Promise<void> {
  const testId = isFailureStore
    ? 'failureStoreRetention-metric'
    : RETENTION_TEST_IDS.retentionMetric;
  await expect(page.getByTestId(testId)).toContainText(expectedValue);
}

/**
 * Verifies a badge is displayed with specific text
 */
export async function verifyRetentionBadge(page: ScoutPage, badgeText: string): Promise<void> {
  await expect(page.getByText(badgeText)).toBeVisible();
}

/**
 * Selects a retention mode (indefinite, custom, or ILM)
 */
export async function selectRetentionMode(
  page: ScoutPage,
  mode: 'indefinite' | 'custom' | 'ilm'
): Promise<void> {
  switch (mode) {
    case 'indefinite':
      await setIndefiniteRetention(page);
      break;
    case 'custom':
      await page.getByRole('button', { name: 'Custom period' }).click();
      break;
    case 'ilm':
      await page.getByRole('button', { name: 'ILM policy' }).click();
      break;
  }
}

/**
 * Verifies the modal is in a specific state
 */
export async function verifyModalState(
  page: ScoutPage,
  expectedState: {
    inheritEnabled?: boolean;
    selectedMode?: 'indefinite' | 'custom' | 'ilm';
    customValue?: string;
    customUnit?: 'd' | 'h' | 'm' | 's';
  }
): Promise<void> {
  if (expectedState.inheritEnabled !== undefined) {
    const inheritSwitch = page.getByTestId(RETENTION_TEST_IDS.inheritSwitch);
    if (expectedState.inheritEnabled) {
      await expect(inheritSwitch).toBeChecked();
    } else {
      await expect(inheritSwitch).not.toBeChecked();
    }
  }

  if (expectedState.selectedMode) {
    // Verify the correct button is selected/active
    // Implementation depends on how the UI shows the selected state
  }

  if (expectedState.customValue !== undefined) {
    const dslField = page.getByTestId(RETENTION_TEST_IDS.dslField);
    await expect(dslField).toHaveValue(expectedState.customValue);
  }
}

/**
 * Verifies that a validation error is displayed
 */
export async function verifyValidationError(page: ScoutPage, expectedError: string): Promise<void> {
  await expect(page.getByText(expectedError)).toBeVisible();
}

/**
 * Verifies the save button state (enabled/disabled)
 */
export async function verifySaveButtonState(
  page: ScoutPage,
  shouldBeEnabled: boolean
): Promise<void> {
  const saveButton = page.getByTestId(RETENTION_TEST_IDS.saveButton);
  if (shouldBeEnabled) {
    await expect(saveButton).toBeEnabled();
  } else {
    await expect(saveButton).toBeDisabled();
  }
}

/**
 * Verifies retention display in the streams table
 */
export async function verifyRetentionInTable(
  page: ScoutPage,
  streamName: string,
  expectedValue: string
): Promise<void> {
  const retentionColumn = page.getByTestId(RETENTION_TEST_IDS.retentionColumn(streamName));
  await expect(retentionColumn).toContainText(expectedValue);
}

/**
 * Disables inherit mode to enable custom retention options
 */
export async function disableInheritMode(page: ScoutPage): Promise<void> {
  await toggleInheritSwitch(page, false);
}

/**
 * Enables inherit mode
 */
export async function enableInheritMode(page: ScoutPage): Promise<void> {
  await toggleInheritSwitch(page, true);
}

/**
 * Verifies that the inherit switch is visible
 */
export async function verifyInheritSwitchVisible(page: ScoutPage): Promise<void> {
  await expect(page.getByTestId(RETENTION_TEST_IDS.inheritSwitch)).toBeVisible();
}

/**
 * Verifies that the inherit switch is not visible
 */
export async function verifyInheritSwitchNotVisible(page: ScoutPage): Promise<void> {
  await expect(page.getByTestId(RETENTION_TEST_IDS.inheritSwitch)).toBeHidden();
}

/**
 * Closes toasts if they exist (safe cleanup helper)
 */
export async function closeToastsIfPresent(page: ScoutPage): Promise<void> {
  const toasts = page.locator('.euiToast');
  if ((await toasts.count()) > 0) {
    await page
      .locator('.euiToast__closeButton')
      .click({ timeout: 1000 })
      .catch(() => {});
  }
}

/**
 * Sets failure store retention with custom value
 */
export async function setFailureStoreRetention(
  page: ScoutPage,
  value: string,
  unit: 'd' | 'h' | 'm' | 's' = 'd'
): Promise<void> {
  await page.getByTestId('streamFailureStoreEditRetention').click();

  // Check if inherit mode is currently ON and turn it OFF if needed
  const inheritSwitch = page.getByTestId('inheritFailureStoreSwitch');
  const isInheritOn = await inheritSwitch.getAttribute('aria-checked');
  if (isInheritOn === 'true') {
    await inheritSwitch.click();
  }

  // Now select custom period type - wait for it to be enabled
  await waitForElementToBeEnabled(page, 'custom');
  await page.getByTestId('custom').click();
  const dialog = page.getByRole('dialog');
  const field = dialog.getByTestId('selectFailureStorePeriodValue');
  await field.fill('');
  await field.fill(value);

  if (unit !== 'd') {
    await dialog.getByTestId('failureStoreDslUnitButton').click();
    await dialog.getByTestId(`failureStoreDslUnitOption-${unit}`).click();
  }

  await page.getByTestId('failureStoreModalSaveButton').click();
}

/**
 * Toggles failure store enabled/disabled
 */
export async function toggleFailureStore(page: ScoutPage, enabled: boolean): Promise<void> {
  if (enabled) {
    await page.getByTestId('streamsAppFailureStoreEnableButton').click();
  } else {
    await page.getByTestId('streamFailureStoreEditRetention').click();
  }

  // Wait for toggle to be enabled after modal opens
  await waitForElementToBeEnabled(page, 'enableFailureStoreToggle');
  await page.getByTestId('enableFailureStoreToggle').click();
  await page.getByTestId('failureStoreModalSaveButton').click();
}

/**
 * Test a list of retention configurations
 */
export async function testRetentionConfigurations(
  page: ScoutPage,
  configs: Array<{ value: string; unit: 'd' | 'h' | 'm' | 's'; display: string }>
): Promise<void> {
  for (const config of configs) {
    await openRetentionModal(page);
    await toggleInheritSwitch(page, false);
    await setCustomRetention(page, config.value, config.unit);
    await saveRetentionChanges(page);
    await verifyRetentionDisplay(page, config.display);
  }
}
