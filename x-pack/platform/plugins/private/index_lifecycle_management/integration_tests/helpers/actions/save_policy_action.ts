/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, fireEvent } from '@testing-library/react';
import { act } from 'react-dom/test-utils';

export const createSavePolicyAction = (httpSetup: any) => async () => {
  // Component state stabilization before saving (main-2co Pattern 4)
  await act(async () => {
    await jest.runOnlyPendingTimersAsync();
  });

  // Use getAllByTestId()[0] to handle duplicate test IDs (main-2co Pattern 6)
  const saveButtons = screen.getAllByTestId('savePolicyButton');
  const saveButton = saveButtons[0] as HTMLButtonElement;

  // Track initial call count
  const initialCallCount = httpSetup.post.mock.calls.length;

  // Use fireEvent.click to trigger the onClick handler directly
  // This matches the Enzyme pattern more closely: find().simulate('click')
  await act(async () => {
    fireEvent.click(saveButton);
    // Advance timers to allow the form to validate (matching main branch pattern)
    await jest.runOnlyPendingTimersAsync();
  });

  // Check if validation errors appeared after clicking save
  // If there's a global error callout, the form prevented submission
  const hasGlobalError = screen.queryByTestId('policyFormErrorsCallout') !== null;
  if (hasGlobalError) {
    // Form validation prevented submission, no POST will be made
    return;
  }

  // Wait for the POST request to be made (main-2co Pattern 15c - Debugging with Retry Loops)
  // The form submission is async: click -> validate -> submit -> POST
  let attempts = 0;
  const maxAttempts = 20;
  while (httpSetup.post.mock.calls.length === initialCallCount && attempts < maxAttempts) {
    await act(async () => {
      await jest.runOnlyPendingTimersAsync();
    });

    // Check again if errors appeared during the wait
    const hasError = screen.queryByTestId('policyFormErrorsCallout') !== null;
    if (hasError) {
      return;
    }

    attempts++;
  }

  if (httpSetup.post.mock.calls.length === initialCallCount) {
    throw new Error(
      `POST request not made after ${attempts} attempts. Initial calls: ${initialCallCount}, Current calls: ${httpSetup.post.mock.calls.length}`
    );
  }
};
