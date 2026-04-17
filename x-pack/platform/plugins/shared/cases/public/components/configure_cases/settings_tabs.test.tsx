/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsTabs } from './settings_tabs';
import { renderWithTestingProviders } from '../../common/mock';

const mockHistoryPush = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: () => ({ push: mockHistoryPush }),
}));

describe('SettingsTabs', () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders General and Templates tabs', () => {
    renderWithTestingProviders(<SettingsTabs activeTab="general" />);

    expect(screen.getByRole('tab', { name: 'General' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Templates' })).toBeInTheDocument();
  });

  it('marks General tab as selected when activeTab is "general"', () => {
    renderWithTestingProviders(<SettingsTabs activeTab="general" />);

    expect(screen.getByRole('tab', { name: 'General' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Templates' })).toHaveAttribute(
      'aria-selected',
      'false'
    );
  });

  it('marks Templates tab as selected when activeTab is "templates"', () => {
    renderWithTestingProviders(<SettingsTabs activeTab="templates" />);

    expect(screen.getByRole('tab', { name: 'Templates' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'General' })).toHaveAttribute('aria-selected', 'false');
  });

  it('navigates to general settings when General tab is clicked', async () => {
    renderWithTestingProviders(<SettingsTabs activeTab="templates" />);

    await user.click(screen.getByRole('tab', { name: 'General' }));

    expect(mockHistoryPush).toHaveBeenCalledWith('/cases/configure');
  });

  it('navigates to templates settings when Templates tab is clicked', async () => {
    renderWithTestingProviders(<SettingsTabs activeTab="general" />);

    await user.click(screen.getByRole('tab', { name: 'Templates' }));

    expect(mockHistoryPush).toHaveBeenCalledWith('/cases/configure/templates');
  });
});
