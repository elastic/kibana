/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, fireEvent, within, waitFor } from '@testing-library/react';
import type { Phase } from '../../../common/types';

const toggleDeletePhase = async () => {
  let button = screen.queryByTestId('disableDeletePhaseButton');
  const wasDisableButton = !!button;

  if (!button) {
    button = screen.queryByTestId('enableDeletePhaseButton');
  }

  if (!button) {
    throw new Error(`Button to enable/disable delete phase was not found.`);
  }

  const innerButton = within(button).queryByRole('button', { hidden: true });
  if (innerButton) {
    fireEvent.click(innerButton);
  } else {
    fireEvent.click(button);
  }

  // Wait for button toggle to complete
  if (wasDisableButton) {
    await waitFor(() =>
      expect(screen.queryByTestId('enableDeletePhaseButton')).toBeInTheDocument()
    );
  } else {
    await waitFor(() =>
      expect(screen.queryByTestId('disableDeletePhaseButton')).toBeInTheDocument()
    );
  }
};

const togglePhase = async (phase: Phase) => {
  const switchElement = screen.getByTestId(`enablePhaseSwitch-${phase}`);
  const isChecked = switchElement.getAttribute('aria-checked') === 'true';

  fireEvent.click(switchElement);

  // Wait for the aria-checked state to change
  await waitFor(() => {
    const updatedSwitch = screen.getByTestId(`enablePhaseSwitch-${phase}`);
    const newState = updatedSwitch.getAttribute('aria-checked') === 'true';
    expect(newState).not.toBe(isChecked);
  });
};

export const createTogglePhaseAction = () => async (phase: Phase) => {
  if (phase === 'delete') {
    await toggleDeletePhase();
  } else {
    await togglePhase(phase);
  }
};
