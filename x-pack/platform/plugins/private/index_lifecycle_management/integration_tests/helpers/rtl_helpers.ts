/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Pure RTL helper functions for ILM tests.
 * These replace the testbed factory pattern with simple, direct functions.
 *
 * Migration from testbed pattern:
 * - Before: const { actions } = setupTestBed(http); await actions.savePolicy();
 * - After: renderEditPolicy(http); await savePolicy(http);
 */

import { screen, fireEvent, within } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import userEvent from '@testing-library/user-event';
import type { HttpSetup } from '@kbn/core/public';
import type { Phase } from '../../common/types';

// ============================================================================
// Form Input Helpers
// ============================================================================

/**
 * Set value in a form field (input or select element).
 * Handles both text inputs and select dropdowns.
 */
export async function setFormField(testId: string, value: string) {
  const user = userEvent.setup({
    advanceTimers: jest.advanceTimersByTime,
    pointerEventsCheck: 0,
  });

  const element = screen.getAllByTestId<HTMLInputElement | HTMLSelectElement>(testId)[0];

  if (element.tagName === 'SELECT') {
    await user.selectOptions(element, value);
    await act(async () => {
      await jest.runOnlyPendingTimersAsync();
    });
  } else {
    const isNumberInput = element.getAttribute('type') === 'number';
    const hasInvalidChars = isNumberInput && /[,]/.test(value);

    if (hasInvalidChars) {
      // Use fireEvent for invalid values to test validation logic
      fireEvent.change(element, { target: { value } });
      await act(async () => {
        element.blur();
        await jest.runOnlyPendingTimersAsync();
      });
    } else {
      await user.clear(element);
      if (value !== '') {
        await user.type(element, value);
      }
      await act(async () => {
        element.blur();
        await jest.runOnlyPendingTimersAsync();
      });
    }
  }
}

/**
 * Toggle a switch or checkbox.
 */
export async function toggleSwitch(testId: string) {
  const element = screen.getAllByTestId(testId)[0];
  fireEvent.click(element);
}

// ============================================================================
// Phase Management
// ============================================================================

/**
 * Toggle a lifecycle phase on/off.
 */
export async function togglePhase(phase: Phase) {
  if (phase === 'delete') {
    let button = screen.queryByTestId('disableDeletePhaseButton');
    let action = 'disable';

    if (!button) {
      button = screen.queryByTestId('enableDeletePhaseButton');
      action = 'enable';
    }

    if (!button) {
      throw new Error(`Button to enable/disable delete phase was not found.`);
    }

    if (action === 'disable') {
      fireEvent.click(button);
    } else {
      const innerButton = within(button).queryByRole('button', { hidden: true });
      if (innerButton) {
        fireEvent.click(innerButton);
      } else {
        fireEvent.click(button);
      }
    }
  } else {
    // Wait for element to appear
    await act(async () => {
      await jest.runOnlyPendingTimersAsync();
    });

    let switchElements = screen.queryAllByTestId(`enablePhaseSwitch-${phase}`);
    let retries = 0;
    while (switchElements.length === 0 && retries < 10) {
      await act(async () => {
        await jest.runOnlyPendingTimersAsync();
      });
      switchElements = screen.queryAllByTestId(`enablePhaseSwitch-${phase}`);
      retries++;
    }

    if (switchElements.length === 0) {
      throw new Error(`Phase switch for ${phase} did not appear`);
    }

    fireEvent.click(switchElements[0]);
    await act(async () => {
      await jest.runOnlyPendingTimersAsync();
    });
  }
}

// ============================================================================
// Policy Actions
// ============================================================================

/**
 * Save the current policy.
 * Waits for validation and form submission to complete.
 */
export async function savePolicy(httpSetup: HttpSetup) {
  const saveButtons = screen.getAllByTestId('savePolicyButton');
  const saveButton = saveButtons[0] as HTMLButtonElement;
  const postMock = jest.mocked(httpSetup.post);
  const initialCallCount = postMock.mock.calls.length;

  fireEvent.click(saveButton);

  // Check for validation errors (immediate)
  const hasGlobalError = screen.queryByTestId('policyFormErrorsCallout') !== null;
  if (hasGlobalError) {
    return; // Form validation prevented submission
  }

  // Wait for POST request with timer advancement
  let attempts = 0;
  const maxAttempts = 20;
  while (postMock.mock.calls.length === initialCallCount && attempts < maxAttempts) {
    await act(async () => {
      await jest.runOnlyPendingTimersAsync();
    });

    const hasError = screen.queryByTestId('policyFormErrorsCallout') !== null;
    if (hasError) {
      return; // Validation error appeared during wait
    }

    attempts++;
  }

  if (attempts >= maxAttempts) {
    throw new Error(
      'Policy save did not trigger POST request. Check for validation errors or form state issues.'
    );
  }
}

/**
 * Set policy name.
 * Uses fireEvent for performance (validation tests don't need realistic typing).
 * Waits for validation to complete.
 */
export async function setPolicyName(name: string) {
  const element = screen.getAllByTestId<HTMLInputElement>('policyNameField')[0];
  fireEvent.change(element, { target: { value: name } });
  fireEvent.blur(element);
  await act(async () => {
    await jest.runOnlyPendingTimersAsync();
  });
}

// ============================================================================
// Rollover Actions
// ============================================================================

/**
 * Set max primary shard size for rollover.
 */
export async function setMaxPrimaryShardSize(value: string, units?: string) {
  const input = screen.getAllByTestId<HTMLInputElement>('hot-selectedMaxPrimaryShardSize')[0];
  fireEvent.change(input, { target: { value } });
  fireEvent.blur(input);

  if (units) {
    const popover = screen.getAllByTestId('hot-selectedMaxPrimaryShardSizeUnits')[0];
    const filterButton = within(popover).getByTestId('show-filters-button');
    fireEvent.click(filterButton);

    await act(async () => {
      await jest.runOnlyPendingTimersAsync();
    });

    const filterOption = screen.getAllByTestId(`filter-option-${units}`)[0];
    fireEvent.click(filterOption);
  }
}

/**
 * Set max age for rollover.
 */
export async function setMaxAge(value: string, units?: string) {
  const input = screen.getAllByTestId<HTMLInputElement>('hot-selectedMaxAge')[0];
  fireEvent.change(input, { target: { value } });
  fireEvent.blur(input);

  if (units) {
    const popover = screen.getAllByTestId('hot-selectedMaxAgeUnits')[0];
    const filterButton = within(popover).getByTestId('show-filters-button');
    fireEvent.click(filterButton);

    await act(async () => {
      await jest.runOnlyPendingTimersAsync();
    });

    const filterOption = screen.getAllByTestId(`filter-option-${units}`)[0];
    fireEvent.click(filterOption);
  }
}

/**
 * Set max size for rollover.
 */
export async function setMaxSize(value: string, units?: string) {
  const input = screen.getAllByTestId<HTMLInputElement>('hot-selectedMaxSizeStored')[0];
  fireEvent.change(input, { target: { value } });
  fireEvent.blur(input);

  if (units) {
    const popover = screen.getAllByTestId('hot-selectedMaxSizeStoredUnits')[0];
    const filterButton = within(popover).getByTestId('show-filters-button');
    fireEvent.click(filterButton);

    await act(async () => {
      await jest.runOnlyPendingTimersAsync();
    });

    const filterOption = screen.getAllByTestId(`filter-option-${units}`)[0];
    fireEvent.click(filterOption);
  }
}

/**
 * Set max docs for rollover.
 */
export async function setMaxDocs(value: string) {
  await setFormField('hot-selectedMaxDocuments', value);
}

/**
 * Set max primary shard docs for rollover.
 */
export async function setMaxPrimaryShardDocs(value: string) {
  await setFormField('hot-selectedMaxPrimaryShardDocs', value);
}

/**
 * Check if rollover settings required callout is visible.
 */
export function hasRolloverSettingRequiredCallout(): boolean {
  return Boolean(screen.queryByTestId('rolloverSettingsRequired'));
}

// ============================================================================
// Error Helpers
// ============================================================================

/**
 * Wait for form validation to complete.
 * Advances timers twice to ensure validation and DOM updates complete.
 */
export async function waitForValidation() {
  await act(async () => {
    await jest.runOnlyPendingTimersAsync();
  });
  // Give React another tick to update the DOM
  await act(async () => {
    await jest.runOnlyPendingTimersAsync();
  });
}

/**
 * Get all error messages currently visible in the form.
 * Optionally scope to a specific phase.
 */
export function getErrorMessages(phase?: Phase): string[] {
  const container = phase ? screen.getByTestId(`${phase}-phase`) : document.body;
  const errorTexts: string[] = [];

  // Method 1: Look for elements with role="alert"
  const alertElements = phase
    ? within(container).queryAllByRole('alert')
    : screen.queryAllByRole('alert');

  alertElements.forEach((el) => {
    const texts = el.querySelectorAll('.euiFormErrorText');
    texts.forEach((text) => {
      const content = text.textContent?.trim();
      if (content) errorTexts.push(content);
    });
  });

  // Method 2: Look for .euiFormErrorText directly
  if (errorTexts.length === 0) {
    const errorElements = container.querySelectorAll('.euiFormErrorText');
    errorElements.forEach((el) => {
      const content = el.textContent?.trim();
      if (content) errorTexts.push(content);
    });
  }

  return errorTexts;
}

/**
 * Assert that specific error messages are displayed.
 * Optionally scope to a specific phase.
 */
export function expectErrorMessages(expectedMessages: string[], phase?: Phase) {
  const actualMessages = getErrorMessages(phase);
  expect(actualMessages).toEqual(expectedMessages);
}

/**
 * Check if the global policy form error callout is visible.
 */
export function hasGlobalErrorCallout(): boolean {
  return Boolean(screen.queryByTestId('policyFormErrorsCallout'));
}

/**
 * Check if a specific phase has an error indicator.
 */
export function hasPhaseErrorIndicator(phase: Phase): boolean {
  return Boolean(screen.queryByTestId(`phaseErrorIndicator-${phase}`));
}

/**
 * Check if a specific field has an error.
 */
export function hasFieldError(testId: string): boolean {
  const elements = screen.queryAllByTestId(testId);
  if (elements.length === 0) return false;

  // Check for error styling or aria-invalid
  return elements.some(
    (el) =>
      el.getAttribute('aria-invalid') === 'true' ||
      el.classList.contains('euiFieldText-isInvalid') ||
      el.classList.contains('euiFieldNumber-isInvalid')
  );
}

/**
 * Get the error message for a specific field.
 */
export function getFieldError(testId: string): string | null {
  const field = screen.queryAllByTestId(testId)[0];
  if (!field) return null;

  // Look for associated error message
  const errorId = field.getAttribute('aria-describedby');
  if (errorId) {
    const errorElement = document.getElementById(errorId);
    if (errorElement) {
      return errorElement.textContent;
    }
  }

  return null;
}
