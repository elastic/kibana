/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type Locator, type ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

/**
 * Test IDs for the data lifecycle / retention UI.
 *
 * The retention editing UX is flyout-based:
 * - The "edit lifecycle method" flyout (inherit + DLM/ILM method) is opened from
 *   the lifecycle summary header action and uses the `streamsEditSuccessfulDataLifecycleFlyout`
 *   prefix.
 * - The custom DSL retention (delete phase) is configured in a separate
 *   `streamsEditSuccessfulDeletePhaseFlyout`.
 */
export const RETENTION_TEST_IDS = {
  // Entry points (lifecycle summary header actions)
  editLifecycleMethodButton: 'dataLifecycleSummaryEditLifecycleMethod',
  addDeletePhaseButton: 'dataLifecycleSummaryAddDeletePhase',
  addPhaseButton: 'dataLifecycleSummaryAddPhase',
  addDownsampleStepButton: 'dataLifecycleSummaryAddDownsampleStep',

  // Successful data: edit lifecycle method flyout
  successfulLifecycleFlyout: 'streamsEditSuccessfulDataLifecycleFlyout',
  successfulInheritCheckbox: 'streamsEditDataLifecycleInheritCheckbox',
  // Backwards-compatible alias for the inherit control (now a checkbox in the flyout).
  inheritSwitch: 'streamsEditDataLifecycleInheritCheckbox',
  successfulFlyoutApplyButton: 'streamsEditDataLifecycleFlyoutApplyButton',
  successfulFlyoutCancelButton: 'streamsEditDataLifecycleFlyoutCancelButton',

  // Successful data: delete phase flyout (custom DSL retention)
  successfulDeletePhaseFlyout: 'streamsEditSuccessfulDeletePhaseFlyout',
  successfulDeletePhaseValue: 'streamsEditSuccessfulDeletePhaseFlyoutDeleteAfterValue',
  successfulDeletePhaseUnit: 'streamsEditSuccessfulDeletePhaseFlyoutDeleteAfterUnit',
  successfulDeletePhaseApplyButton: 'streamsEditSuccessfulDeletePhaseFlyoutApplyButton',
  successfulDeletePhaseCancelButton: 'streamsEditSuccessfulDeletePhaseFlyoutCancelButton',
  successfulDeletePhaseRemoveButton:
    'streamsEditSuccessfulDeletePhaseFlyoutRemoveDeletePhaseButton',

  // Lifecycle method cards (DLM / ILM)
  methodCardDlm: 'editDataLifecycle-methodCard-dlm',
  methodCardIlm: 'editDataLifecycle-methodCard-ilm',

  // ILM policy selector (inside the lifecycle method flyout when ILM is selected)
  ilmSearchInput: 'retentionSelectorSearchInput',
  ilmPolicyRow: (policyName: string) =>
    `retentionSelectableRow-${policyName.replace(/[^a-zA-Z0-9]+/g, '_')}`,

  // Display elements
  retentionMetric: 'retention-metric',
  retentionMetricSubtitle: 'retention-metric-subtitle',
  retentionCard: 'retentionCard',
  failureStoreRetentionCard: 'failureStoreRetentionCard',
  failureStoreRetentionMetric: 'failureStoreRetention-metric',
  failureStoreRetentionMetricSubtitle: 'failureStoreRetention-metric-subtitle',
  retentionColumn: (streamName: string) => `retentionColumn-${streamName}`,
  lifecycleBadge: 'lifecycleBadge',

  // Failure store: edit failed lifecycle flyout
  failureStoreEnableButton: 'streamsAppFailureStoreEnableButton',
  failureStoreEditButton: 'failureStoreSummaryEditFailedLifecycle',
  failureStoreAddDeletePhaseButton: 'failureStoreSummaryAddDeletePhase',
  failedLifecycleFlyout: 'streamsEditFailedDataLifecycleFlyout',
  failedInheritCheckbox: 'streamsEditDataLifecycleInheritCheckbox',
  enableFailureStoreCheckbox: 'editFailedDataLifecycle-enableFailureStoreCheckbox',
  failedFlyoutApplyButton: 'streamsEditDataLifecycleFlyoutApplyButton',
  failedFlyoutCancelButton: 'streamsEditDataLifecycleFlyoutCancelButton',

  // Failure store: delete phase flyout (custom failed retention)
  failedDeletePhaseFlyout: 'streamsEditFailedDeletePhaseFlyout',
  failedDeletePhaseValue: 'streamsEditFailedDeletePhaseFlyoutDeleteAfterValue',
  failedDeletePhaseUnit: 'streamsEditFailedDeletePhaseFlyoutDeleteAfterUnit',
  failedDeletePhaseApplyButton: 'streamsEditFailedDeletePhaseFlyoutApplyButton',
  failedDeletePhaseRemoveButton: 'streamsEditFailedDeletePhaseFlyoutRemoveDeletePhaseButton',
} as const;

/**
 * Confirms the "This will override index template settings" modal when it appears.
 *
 * Saving a DLM lifecycle change (successful or failure store) on a stream that
 * currently inherits its lifecycle (classic streams and root wired streams)
 * shows this confirmation modal before the change is applied. It does not appear
 * once the stream already overrides the inherited settings, so this is a no-op
 * in that case.
 */
export async function confirmOverrideIfPresent(page: ScoutPage): Promise<void> {
  const overrideButton = page.getByTestId('overrideSettingsModal-overrideButton');
  if (
    await overrideButton
      .waitFor({ state: 'visible', timeout: 3_000 })
      .then(() => true)
      .catch(() => false)
  ) {
    await overrideButton.click();
    await expect(overrideButton).toBeHidden();
  }
}

// Mock retention values for testing
export const MOCK_RETENTION_VALUES = {
  sevenDays: { value: '7', unit: 'd' as const, display: '7 days' },
  oneDay: { value: '1', unit: 'd' as const, display: '1 day' },
  twentyFourHours: { value: '24', unit: 'h' as const, display: '24 hours' },
  oneHour: { value: '1', unit: 'h' as const, display: '1 hour' },
  sixtyMinutes: { value: '60', unit: 'm' as const, display: '60 minutes' },
  oneMinute: { value: '1', unit: 'm' as const, display: '1 minute' },
  thirtyDays: { value: '30', unit: 'd' as const, display: '30 days' },
  ninetyDays: { value: '90', unit: 'd' as const, display: '90 days' },
} as const;

/**
 * Opens the "edit lifecycle method" flyout (inherit + DLM/ILM) for successful data.
 */
export async function openLifecycleMethodFlyout(page: ScoutPage): Promise<Locator> {
  await page.getByTestId(RETENTION_TEST_IDS.editLifecycleMethodButton).click();
  const flyout = page.getByTestId(RETENTION_TEST_IDS.successfulLifecycleFlyout);
  await expect(flyout).toBeVisible();
  return flyout;
}

/**
 * Backwards-compatible alias used by specs: opens the lifecycle method flyout.
 */
export const openRetentionModal = openLifecycleMethodFlyout;

/**
 * Saves the lifecycle method flyout changes (Apply) and waits for it to close.
 */
export async function saveRetentionChanges(page: ScoutPage): Promise<void> {
  await page.getByTestId(RETENTION_TEST_IDS.successfulFlyoutApplyButton).click();
  await confirmOverrideIfPresent(page);
  await expect(page.getByTestId(RETENTION_TEST_IDS.successfulLifecycleFlyout)).toBeHidden();
}

/**
 * Cancels the lifecycle method flyout and waits for it to close.
 */
export async function cancelRetentionChanges(page: ScoutPage): Promise<void> {
  await page.getByTestId(RETENTION_TEST_IDS.successfulFlyoutCancelButton).click();
  await expect(page.getByTestId(RETENTION_TEST_IDS.successfulLifecycleFlyout)).toBeHidden();
}

/**
 * Toggles the "inherit lifecycle" checkbox inside the lifecycle method flyout.
 */
export async function toggleInheritSwitch(page: ScoutPage, enabled: boolean): Promise<void> {
  const inheritCheckbox = page.getByTestId(RETENTION_TEST_IDS.successfulInheritCheckbox);
  await inheritCheckbox.waitFor({ state: 'visible' });
  const isChecked = await inheritCheckbox.isChecked();

  if (isChecked !== enabled) {
    await inheritCheckbox.click();
  }

  if (enabled) {
    await expect(inheritCheckbox).toBeChecked();
  } else {
    await expect(inheritCheckbox).not.toBeChecked();
  }
}

/**
 * Verifies the "inherit lifecycle" checkbox is visible inside the lifecycle method flyout.
 */
export async function verifyInheritSwitchVisible(page: ScoutPage): Promise<void> {
  await expect(page.getByTestId(RETENTION_TEST_IDS.successfulInheritCheckbox)).toBeVisible();
}

/**
 * Selects the ILM lifecycle method inside the lifecycle method flyout.
 */
export async function selectIlmMethod(page: ScoutPage): Promise<void> {
  const card = page.getByTestId(RETENTION_TEST_IDS.methodCardIlm);
  await card.waitFor({ state: 'visible' });
  await card.getByRole('radio').click();
}

/**
 * Selects the DLM (data stream lifecycle) method inside the lifecycle method flyout.
 */
export async function selectDlmMethod(page: ScoutPage): Promise<void> {
  const card = page.getByTestId(RETENTION_TEST_IDS.methodCardDlm);
  await card.waitFor({ state: 'visible' });
  await card.getByRole('radio').click();
}

/**
 * Selects an ILM policy by name in the ILM retention selector
 * (the lifecycle method flyout must already have ILM selected).
 */
export async function selectIlmPolicy(page: ScoutPage, policyName: string): Promise<void> {
  await selectIlmMethod(page);
  const search = page.getByTestId(RETENTION_TEST_IDS.ilmSearchInput);
  await search.waitFor({ state: 'visible' });
  await search.fill(policyName);
  await page.getByTestId(RETENTION_TEST_IDS.ilmPolicyRow(policyName)).click();
}

/**
 * Opens the delete-phase flyout for successful data so a custom DSL retention can be set.
 *
 * When no delete phase exists yet, the entry point is the "Add delete phase" header
 * action. When a delete phase already exists, it is edited via the lifecycle bar phase
 * popover edit button.
 */
export async function openDeletePhaseFlyout(page: ScoutPage): Promise<Locator> {
  const addButton = page.getByTestId(RETENTION_TEST_IDS.addDeletePhaseButton);
  const deletePhaseButton = page.getByTestId('lifecyclePhase-delete-button');
  const flyout = page.getByTestId(RETENTION_TEST_IDS.successfulDeletePhaseFlyout);

  // Either the "Add delete phase" header action is shown (no delete phase yet)
  // or an existing delete phase is edited through the lifecycle bar popover.
  // Wait for whichever entry point renders first to avoid racing on visibility.
  const opener = await Promise.any([
    addButton.waitFor({ state: 'visible', timeout: 15_000 }).then(() => 'add' as const),
    deletePhaseButton.waitFor({ state: 'visible', timeout: 15_000 }).then(() => 'edit' as const),
  ]);

  if (opener === 'add') {
    await addButton.click();
  } else {
    await deletePhaseButton.click();
    await page.getByTestId('lifecyclePhase-delete-editButton').click();
  }

  await expect(flyout).toBeVisible();
  return flyout;
}

/**
 * Sets a custom DSL retention (delete phase) for successful data.
 * Opens the delete-phase flyout, fills the value/unit and applies.
 */
export async function setCustomRetention(
  page: ScoutPage,
  value: string,
  unit: 'd' | 'h' | 'm' | 's' = 'd'
): Promise<void> {
  const flyout = await openDeletePhaseFlyout(page);

  const field = flyout.getByTestId(RETENTION_TEST_IDS.successfulDeletePhaseValue);
  await field.fill('');
  await field.fill(value);

  await flyout.getByTestId(RETENTION_TEST_IDS.successfulDeletePhaseUnit).selectOption(unit);

  // Blur so the field commits before submit.
  await flyout.getByTestId(RETENTION_TEST_IDS.successfulDeletePhaseUnit).click();

  await page.getByTestId(RETENTION_TEST_IDS.successfulDeletePhaseApplyButton).click();
  await confirmOverrideIfPresent(page);
  await expect(page.getByTestId(RETENTION_TEST_IDS.successfulDeletePhaseFlyout)).toBeHidden();
}

/**
 * Removes the delete phase (resets to indefinite retention) for successful data.
 */
export async function removeDeletePhase(page: ScoutPage): Promise<void> {
  await openDeletePhaseFlyout(page);
  await page.getByTestId(RETENTION_TEST_IDS.successfulDeletePhaseRemoveButton).click();
  await confirmOverrideIfPresent(page);
  await expect(page.getByTestId(RETENTION_TEST_IDS.successfulDeletePhaseFlyout)).toBeHidden();
}

/**
 * Verifies the displayed retention value.
 */
export async function verifyRetentionDisplay(
  page: ScoutPage,
  expectedValue: string,
  isFailureStore = false
): Promise<void> {
  const testId = isFailureStore
    ? RETENTION_TEST_IDS.failureStoreRetentionMetric
    : RETENTION_TEST_IDS.retentionMetric;
  await expect(page.getByTestId(testId)).toContainText(expectedValue);
}

/**
 * Verifies retention display in the streams table.
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
 * Closes toasts if they exist (safe cleanup helper).
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

// ---------------------------------------------------------------------------
// Failure store helpers
// ---------------------------------------------------------------------------

/**
 * Opens the "edit failed data lifecycle" flyout. Works from either the disabled
 * panel (Enable failure store) or the enabled summary (edit action).
 */
export async function openFailureStoreFlyout(page: ScoutPage): Promise<Locator> {
  const enableButton = page.getByTestId(RETENTION_TEST_IDS.failureStoreEnableButton);
  const editButton = page.getByTestId(RETENTION_TEST_IDS.failureStoreEditButton);

  const opener = await Promise.any([
    enableButton.waitFor({ state: 'visible', timeout: 10_000 }).then(() => enableButton),
    editButton.waitFor({ state: 'visible', timeout: 10_000 }).then(() => editButton),
  ]);

  await opener.click();
  const flyout = page.getByTestId(RETENTION_TEST_IDS.failedLifecycleFlyout);
  await expect(flyout).toBeVisible();
  return flyout;
}

/**
 * Saves failure store changes in the shared failure store modal
 * (`@kbn/failure-store-modal`, used from the data quality page).
 */
export async function saveFailureStoreChanges(page: ScoutPage): Promise<void> {
  const saveButton = page.getByTestId('failureStoreModalSaveButton');
  await expect(saveButton).toBeEnabled();
  await saveButton.click();
}

/**
 * Saves the streams "edit failed data lifecycle" flyout (Apply) and waits for it to close.
 */
export async function applyFailedLifecycleFlyout(page: ScoutPage): Promise<void> {
  const saveButton = page.getByTestId(RETENTION_TEST_IDS.failedFlyoutApplyButton);
  await expect(saveButton).toBeEnabled();
  await saveButton.click();
  await confirmOverrideIfPresent(page);
  await expect(page.getByTestId(RETENTION_TEST_IDS.failedLifecycleFlyout)).toBeHidden();
}

/**
 * Ensures the failure store "inherit" checkbox is unchecked, if visible.
 */
export async function disableInheritFailureStoreIfEnabled(page: ScoutPage): Promise<void> {
  const inheritCheckbox = page.getByTestId(RETENTION_TEST_IDS.failedInheritCheckbox);
  if (await inheritCheckbox.isVisible().catch(() => false)) {
    if (await inheritCheckbox.isChecked()) {
      await inheritCheckbox.click();
    }
  }
}

/**
 * Toggles failure store enabled/disabled via the edit failed lifecycle flyout.
 */
export async function toggleFailureStore(page: ScoutPage, enabled: boolean): Promise<void> {
  await openFailureStoreFlyout(page);

  // For wired (and non-root) streams the failure store can inherit from the
  // parent. Stop inheriting so the enabled state can be controlled directly.
  await disableInheritFailureStoreIfEnabled(page);

  const checkbox = page.getByTestId(RETENTION_TEST_IDS.enableFailureStoreCheckbox);
  await checkbox.waitFor({ state: 'visible' });
  if ((await checkbox.isChecked()) !== enabled) {
    await checkbox.click();
  }

  // The Apply button is disabled when the draft matches the current settings
  // (neither the inherit nor the enabled state changed). In that case the
  // failure store is already in the desired state, so just close the flyout.
  const applyButton = page.getByTestId(RETENTION_TEST_IDS.failedFlyoutApplyButton);
  const applyEnabled = await applyButton
    .isEnabled()
    .then((isEnabled) => isEnabled)
    .catch(() => false);

  if (!applyEnabled) {
    await page.getByTestId(RETENTION_TEST_IDS.failedFlyoutCancelButton).click();
    await expect(page.getByTestId(RETENTION_TEST_IDS.failedLifecycleFlyout)).toBeHidden();
    return;
  }

  await applyFailedLifecycleFlyout(page);
}

/**
 * Sets a custom failure store retention by opening the failed delete-phase flyout.
 * Requires the failure store to already be enabled.
 */
export async function setFailureStoreRetention(
  page: ScoutPage,
  value: string,
  unit: 'd' | 'h' | 'm' | 's' = 'd'
): Promise<void> {
  const addButton = page.getByTestId(RETENTION_TEST_IDS.failureStoreAddDeletePhaseButton);
  const deletePhaseButton = page.getByTestId('failureStore-lifecyclePhase-delete-button');
  const flyout = page.getByTestId(RETENTION_TEST_IDS.failedDeletePhaseFlyout);

  const opener = await Promise.any([
    addButton.waitFor({ state: 'visible', timeout: 15_000 }).then(() => 'add' as const),
    deletePhaseButton.waitFor({ state: 'visible', timeout: 15_000 }).then(() => 'edit' as const),
  ]);

  if (opener === 'add') {
    await addButton.click();
  } else {
    await deletePhaseButton.click();
    await page.getByTestId('lifecyclePhase-delete-editButton').click();
  }
  await expect(flyout).toBeVisible();

  const field = flyout.getByTestId(RETENTION_TEST_IDS.failedDeletePhaseValue);
  await field.fill('');
  await field.fill(value);
  await flyout.getByTestId(RETENTION_TEST_IDS.failedDeletePhaseUnit).selectOption(unit);
  await flyout.getByTestId(RETENTION_TEST_IDS.failedDeletePhaseUnit).click();

  await page.getByTestId(RETENTION_TEST_IDS.failedDeletePhaseApplyButton).click();
  await confirmOverrideIfPresent(page);
  await expect(flyout).toBeHidden();
}

/**
 * Removes the failure store delete phase (sets retention to indefinite / disables lifecycle)
 * via the phase popover remove action. Requires the failure store to be enabled with a delete phase.
 */
export async function removeFailureStoreDeletePhase(page: ScoutPage): Promise<void> {
  await page.getByTestId('failureStore-lifecyclePhase-delete-button').click();
  await page.getByTestId('lifecyclePhase-delete-removeButton').click();
  await confirmOverrideIfPresent(page);
}
