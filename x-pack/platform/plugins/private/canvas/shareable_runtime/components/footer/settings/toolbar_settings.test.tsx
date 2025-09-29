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
import { ToolbarSettings } from './toolbar_settings';

jest.mock('../../../supported_renderers');

describe('<ToolbarSettings />', () => {
  const mockOnSetAutohide = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderToolbarSettings = () => {
    return render(
      <JestContext>
        <ToolbarSettings onSetAutohide={mockOnSetAutohide} />
      </JestContext>
    );
  };

  test('renders as expected', () => {
    renderToolbarSettings();

    const switchButton = screen.getByTestId('hideToolbarSwitch');
    expect(switchButton).toBeInTheDocument();
    expect(switchButton).toHaveAttribute('aria-checked', 'false');
  });

  test('activates and deactivates', async () => {
    const user = userEvent.setup();
    renderToolbarSettings();

    const switchButton = screen.getByTestId('hideToolbarSwitch');

    // Initially unchecked
    expect(switchButton).toHaveAttribute('aria-checked', 'false');

    // Click to activate
    await user.click(switchButton);
    expect(switchButton).toHaveAttribute('aria-checked', 'true');
    expect(mockOnSetAutohide).toHaveBeenCalledWith(true);

    // Click to deactivate
    await user.click(switchButton);
    expect(switchButton).toHaveAttribute('aria-checked', 'false');
    expect(mockOnSetAutohide).toHaveBeenCalledWith(false);

    expect(mockOnSetAutohide).toHaveBeenCalledTimes(2);
  });
});
