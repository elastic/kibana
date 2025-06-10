/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '../../../helpers/test_helper';
import { SettingsTab } from './settings_tab';
import { useAppContext } from '../../../hooks/use_app_context';

jest.mock('../../../hooks/use_app_context');

const useAppContextMock = useAppContext as jest.Mock;

describe('SettingsTab', () => {
  useAppContextMock.mockReturnValue({ config: { spacesEnabled: true, visibilityEnabled: true } });
  it('should offer a way to configure Observability AI Assistant visibility in apps', () => {
    const navigateToAppMock = jest.fn(() => Promise.resolve());
    const { getByTestId } = render(<SettingsTab />, {
      coreStart: {
        application: { navigateToApp: navigateToAppMock },
      },
    });

    const { getAllByTestId } = render(<SettingsTab />);
    const [firstSpacesButton] = getAllByTestId('settingsTabGoToSpacesButton');

    expect(firstSpacesButton).toHaveAttribute('href', expectedSpacesUrl);
  });

  it('should offer a way to configure Gen AI connectors', () => {
    const navigateToAppMock = jest.fn(() => Promise.resolve());
    const { getByTestId } = render(<SettingsTab />, {
      coreStart: {
        application: { navigateToApp: navigateToAppMock },
      },
    });

    const { getByTestId } = render(<SettingsTab />);
    const connectorsButton = getByTestId('settingsTabGoToConnectorsButton');

    expect(connectorsButton).toHaveAttribute('href', expectedConnectorsUrl);
  });
});
