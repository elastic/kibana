/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import React from 'react';
import { ConnectorSelector } from './connector_selector';

const mockGetAddConnectorFlyout = jest.fn(() => <div data-test-subj="addConnectorFlyout" />);
const mockInvalidateQueries = jest.fn();
const mockSetQueryData = jest.fn();

jest.mock('@kbn/core-di-browser', () => ({
  useService: (token: unknown) => {
    if (token === 'application') return {};
    if (token === 'plugin.start.triggersActionsUi') {
      return { getAddConnectorFlyout: mockGetAddConnectorFlyout };
    }
    return {};
  },
  CoreStart: (key: string) => key,
}));

jest.mock('@kbn/core-di', () => ({
  PluginStart: (key: string) => `plugin.start.${key}`,
}));

jest.mock('../hooks/use_fetch_connectors_by_type', () => ({
  ALL_CONNECTORS_KEY: ['alertingV2', 'actionForm', 'connectors'],
  useFetchConnectorsByType: () => ({ data: [], isLoading: false }),
}));

jest.mock('@kbn/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: mockInvalidateQueries,
    setQueryData: mockSetQueryData,
  }),
}));

const renderSelector = (
  connectorCreation?: { mode: 'flyout' } | { mode: 'new-tab'; href: string }
) =>
  render(
    <I18nProvider>
      <ConnectorSelector
        connectorTypeId=".email"
        value={null}
        onChange={jest.fn()}
        connectorCreationConfig={connectorCreation}
      />
    </I18nProvider>
  );

describe('ConnectorSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens connector management in a new tab when configured', () => {
    renderSelector({
      mode: 'new-tab',
      href: '/app/management/insightsAndAlerting/triggersActionsConnectors/connectors',
    });

    expect(screen.getByTestId('singleStepWorkflowCreateConnectorLink')).toHaveAttribute(
      'href',
      '/app/management/insightsAndAlerting/triggersActionsConnectors/connectors'
    );
    expect(screen.getByTestId('singleStepWorkflowCreateConnectorLink')).toHaveAttribute(
      'target',
      '_blank'
    );
    expect(screen.getByTestId('singleStepWorkflowCreateConnectorLink')).toHaveAttribute(
      'rel',
      'noopener noreferrer'
    );
  });

  it('refreshes connectors whenever the selector is opened', () => {
    renderSelector();

    const selector = screen.getByTestId('singleStepWorkflowConnectorSelect');
    fireEvent.focus(selector);
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['alertingV2', 'actionForm', 'connectors'],
    });

    fireEvent.blur(selector);
    fireEvent.focus(selector);
    expect(mockInvalidateQueries).toHaveBeenCalledTimes(2);
  });

  it('opens the connector flyout by default', async () => {
    const user = userEvent.setup();
    renderSelector();

    await user.click(screen.getByTestId('singleStepWorkflowCreateConnectorLink'));

    expect(mockGetAddConnectorFlyout).toHaveBeenCalledWith(
      expect.objectContaining({ initialConnector: { actionTypeId: '.email' } })
    );
    expect(screen.getByTestId('addConnectorFlyout')).toBeInTheDocument();
  });
});
