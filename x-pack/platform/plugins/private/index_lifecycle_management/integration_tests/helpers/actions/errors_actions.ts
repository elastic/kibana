/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, within } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import type { Phase } from '../../../common/types';

const waitForValidation = async () => {
  await act(async () => {
    await jest.runOnlyPendingTimersAsync();
  });
  // Give React another tick to update the DOM
  await act(async () => {
    await jest.runOnlyPendingTimersAsync();
  });
};

const getErrorMessages = (phase?: Phase): string[] => {
  // Try multiple selectors to find error messages
  const container = phase ? screen.getByTestId(`${phase}-phase`) : document.body;

  // Look for error messages in multiple ways
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
};

const expectMessages = (expectedMessages: string[], phase?: Phase) => {
  const actualMessages = getErrorMessages(phase);
  expect(actualMessages).toEqual(expectedMessages);
};

export const createErrorsActions = () => {
  return {
    errors: {
      waitForValidation,
      haveGlobalCallout: () => Boolean(screen.queryByTestId('policyFormErrorsCallout')),
      havePhaseCallout: (phase: Phase) =>
        Boolean(screen.queryByTestId(`phaseErrorIndicator-${phase}`)),
      expectMessages,
    },
  };
};
