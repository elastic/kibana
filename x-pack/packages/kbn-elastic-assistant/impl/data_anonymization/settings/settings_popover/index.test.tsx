/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TestProviders } from '../../../mock/test_providers/test_providers';
import * as i18n from './translations';
import { SettingsPopover } from '.';

describe('SettingsPopover', () => {
  beforeEach(() => {
    render(
      <TestProviders>
        <SettingsPopover />
      </TestProviders>
    );
  });

  it('renders the settings button', () => {
    const settingsButton = screen.getByTestId('settings');

    expect(settingsButton).toBeInTheDocument();
  });

  it('opens the popover when the settings button is clicked', () => {
    const settingsButton = screen.getByTestId('settings');

    userEvent.click(settingsButton);

    const popover = screen.queryByText(i18n.ANONYMIZATION);
    expect(popover).toBeInTheDocument();
  });
});
