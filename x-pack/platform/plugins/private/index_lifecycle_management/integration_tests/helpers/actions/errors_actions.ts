/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, within, waitFor } from '@testing-library/react';
import type { Phase } from '../../../common/types';

const getErrorMessages = (phase?: Phase): string[] => {
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
};

export const expectErrorMessages = async (expectedMessages: string[], phase?: Phase) => {
  await waitFor(() => {
    const actualMessages = getErrorMessages(phase);
    expect(actualMessages).toEqual(expectedMessages);
  });
};

export const haveGlobalErrorCallout = () =>
  Boolean(screen.queryByTestId('policyFormErrorsCallout'));

export const havePhaseErrorCallout = (phase: Phase) =>
  Boolean(screen.queryByTestId(`phaseErrorIndicator-${phase}`));
