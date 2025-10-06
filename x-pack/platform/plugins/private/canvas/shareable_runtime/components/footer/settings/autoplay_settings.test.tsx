/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JestContext } from '../../../test/context_jest';
import { AutoplaySettings } from './autoplay_settings';

jest.mock('../../../supported_renderers');

describe('<AutoplaySettings />', () => {
  const renderAutoplaySettings = () => {
    return render(
      <JestContext>
        <AutoplaySettings />
      </JestContext>
    );
  };

  test('renders as expected', () => {
    renderAutoplaySettings();

    const cycleSwitch = screen.getByRole('switch', { name: 'Cycle Slides' });
    const intervalInput = screen.getByDisplayValue('5s');

    expect(cycleSwitch).toHaveAttribute('aria-checked', 'false');
    expect(intervalInput).toHaveValue('5s');
  });

  test('activates and deactivates', async () => {
    const user = userEvent.setup();
    renderAutoplaySettings();

    const cycleSwitch = screen.getByRole('switch', { name: 'Cycle Slides' });

    // Initially unchecked
    expect(cycleSwitch).toHaveAttribute('aria-checked', 'false');

    // Click to activate
    await user.click(cycleSwitch);
    expect(cycleSwitch).toHaveAttribute('aria-checked', 'true');

    // Click to deactivate
    await user.click(cycleSwitch);
    expect(cycleSwitch).toHaveAttribute('aria-checked', 'false');
  });

  test('changes properly with input', async () => {
    const user = userEvent.setup();
    renderAutoplaySettings();

    const intervalInput = screen.getByDisplayValue('5s');
    const submitButton = screen.getByRole('button', { name: 'Set' });

    // Test invalid input
    await user.clear(intervalInput);
    await user.type(intervalInput, '2asd');
    expect(submitButton).toBeDisabled();

    // Test valid input
    await user.clear(intervalInput);
    await user.type(intervalInput, '2s');
    expect(submitButton).toBeEnabled();
    expect(intervalInput).toHaveValue('2s');

    // Submit form
    await user.click(submitButton);
    expect(intervalInput).toHaveValue('2s');
    expect(submitButton).toBeEnabled();
  });
});
