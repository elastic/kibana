/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, fireEvent, within } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import type { Phase } from '../../../common/types';

const toggleDeletePhase = () => {
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
      // Fallback: click the container directly
      fireEvent.click(button);
    }
  }
};

const togglePhase = async (phase: Phase) => {
  // Wait for the element to appear using timer advancement (waitFor conflicts with fake timers)
  await act(async () => {
    await jest.runOnlyPendingTimersAsync();
  });

  // Retry loop to wait for element to appear
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

  await act(async () => {
    fireEvent.click(switchElements[0]);
    await jest.runOnlyPendingTimersAsync();
  });
};

export const createTogglePhaseAction = () => async (phase: Phase) => {
  if (phase === 'delete') {
    toggleDeletePhase();
  } else {
    await togglePhase(phase);
  }
};
