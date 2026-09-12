/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ConnectorSettingsPopover } from './connector_settings_popover';
import { renderWithTestingProviders } from '../../../../../common/mock';
import { useConfigureCasesNavigation } from '../../../../../common/navigation/hooks';

jest.mock('../../../../../common/navigation/hooks');

describe('ConnectorSettingsPopover', () => {
  const navigateToConfigureCases = jest.fn();
  const user = userEvent.setup({ pointerEventsCheck: 0 });

  beforeEach(() => {
    jest.clearAllMocks();
    (useConfigureCasesNavigation as jest.Mock).mockReturnValue({
      getConfigureCasesUrl: jest.fn().mockReturnValue('/app/security/cases/configure'),
      navigateToConfigureCases,
    });
  });

  it('renders the settings button', () => {
    renderWithTestingProviders(<ConnectorSettingsPopover />);

    expect(screen.getByTestId('sidebar-connector-settings')).toBeInTheDocument();
  });

  it('does not render the menu item until the button is clicked', () => {
    renderWithTestingProviders(<ConnectorSettingsPopover />);

    expect(
      screen.queryByTestId('sidebar-connector-settings-add-connector')
    ).not.toBeInTheDocument();
  });

  it('renders the add connector menu item when the button is clicked', async () => {
    renderWithTestingProviders(<ConnectorSettingsPopover />);

    await user.click(screen.getByTestId('sidebar-connector-settings'));

    expect(
      await screen.findByTestId('sidebar-connector-settings-add-connector')
    ).toBeInTheDocument();
  });

  it('navigates to the configure cases page when the add connector item is clicked', async () => {
    renderWithTestingProviders(<ConnectorSettingsPopover />);

    await user.click(screen.getByTestId('sidebar-connector-settings'));
    await user.click(await screen.findByTestId('sidebar-connector-settings-add-connector'));

    expect(navigateToConfigureCases).toHaveBeenCalled();
  });

  it('supports a custom data-test-subj', () => {
    renderWithTestingProviders(
      <ConnectorSettingsPopover data-test-subj="custom-connector-settings" />
    );

    expect(screen.getByTestId('custom-connector-settings')).toBeInTheDocument();
  });
});
