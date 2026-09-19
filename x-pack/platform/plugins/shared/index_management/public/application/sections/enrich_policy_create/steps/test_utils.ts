/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SetStateAction } from 'react';
import { act, fireEvent, screen, within } from '@testing-library/react';

/**
 * Selects an option of an `EuiComboBox` whose options are already loaded.
 *
 * Opens the list with the toggle button and clicks the option directly; the generic
 * `EuiComboBoxTestHarness` spends hundreds of milliseconds per selection on role queries and
 * pointer-event simulation that these step tests do not need.
 */
export const selectComboBoxOption = async (comboBoxTestId: string, label: string) => {
  const comboBox = screen.getByTestId(comboBoxTestId);
  // EuiPopover updates asynchronously after opening; flush it inside act to avoid warnings.
  await act(async () => {
    fireEvent.click(within(comboBox).getByTestId('comboBoxToggleListButton'));
  });
  const optionsList = screen.getByTestId(new RegExp(`${comboBoxTestId}-optionsList`));
  await act(async () => {
    fireEvent.click(within(optionsList).getByRole('option', { name: label }));
  });
};

/**
 * Resolves the value a `useState` setter mock was last called with, applying an updater
 * function to `previous` when the setter was called with one.
 */
export const getLastSetStateValue = <S>(
  setter: jest.Mock<void, [SetStateAction<S>]>,
  previous: S
): S => {
  expect(setter).toHaveBeenCalled();
  const [action] = setter.mock.calls[setter.mock.calls.length - 1];
  return typeof action === 'function' ? (action as (prev: S) => S)(previous) : action;
};
