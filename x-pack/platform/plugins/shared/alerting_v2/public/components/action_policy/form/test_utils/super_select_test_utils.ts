/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen } from '@testing-library/react';
import type userEvent from '@testing-library/user-event';

type UserEvent = ReturnType<typeof userEvent.setup>;

export const selectSuperSelectOption = async (
  user: UserEvent,
  testSubj: string,
  optionLabel: string
) => {
  await user.click(screen.getByTestId(testSubj));
  await user.click(await screen.findByRole('option', { name: optionLabel }));
};

export const expectSuperSelectValue = (testSubj: string, label: string) => {
  expect(screen.getByTestId(testSubj)).toHaveTextContent(label);
};

export const selectStrategyOption = async (user: UserEvent, strategy: string) => {
  const option = screen.getByTestId(`strategyOption-${strategy}`);
  const input = option.matches('input') ? option : option.querySelector('input');
  expect(input).toBeTruthy();
  await user.click(input!);
};

export const expectStrategyOptionSelected = (strategy: string) => {
  const option = screen.getByTestId(`strategyOption-${strategy}`);
  const input = option.matches('input') ? option : option.querySelector('input');
  expect(input).toBeChecked();
};
