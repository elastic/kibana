/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { AddAiConnectorButton } from './add_ai_connector_button';
import { useAuthorization } from '../hooks/use_authorization';
import { useAiConnectors } from '../hooks/use_ai_connectors';

jest.mock('../hooks/use_authorization', () => ({
  useAuthorization: jest.fn(),
}));
const mockUseAuthorization = useAuthorization as jest.Mock;

jest.mock('../hooks/use_ai_connectors', () => ({
  useAiConnectors: jest.fn(),
}));
const mockUseAiConnectors = useAiConnectors as jest.Mock;
const mockRefetch = jest.fn();

jest.mock('./connector_setup', () => ({
  ConnectorSetup: ({
    onClose,
    onConnectorCreated,
  }: {
    onClose: () => void;
    onConnectorCreated: () => void;
  }) => (
    <div data-test-subj="connectorSetupFlyout">
      <button type="button" data-test-subj="mockSetupClose" onClick={onClose}>
        {'Close'}
      </button>
      <button type="button" data-test-subj="mockSetupCreate" onClick={onConnectorCreated}>
        {'Create'}
      </button>
    </div>
  ),
}));

const renderButton = () =>
  render(
    <I18nProvider>
      <AddAiConnectorButton />
    </I18nProvider>
  );

describe('AddAiConnectorButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthorization.mockReturnValue({ canCreateConnectors: true });
    mockUseAiConnectors.mockReturnValue({ refetch: mockRefetch });
  });

  it('renders the "Add AI connector" label', () => {
    const { getByTestId } = renderButton();
    expect(getByTestId('addNewConnectorButton')).toHaveTextContent('Add AI connector');
  });

  it('opens the connector setup flyout when clicked', () => {
    const { getByTestId, queryByTestId } = renderButton();
    expect(queryByTestId('connectorSetupFlyout')).not.toBeInTheDocument();

    fireEvent.click(getByTestId('addNewConnectorButton'));

    expect(getByTestId('connectorSetupFlyout')).toBeInTheDocument();
  });

  it('closes the setup flyout without refetching when closed', () => {
    const { getByTestId, queryByTestId } = renderButton();

    fireEvent.click(getByTestId('addNewConnectorButton'));
    fireEvent.click(getByTestId('mockSetupClose'));

    expect(queryByTestId('connectorSetupFlyout')).not.toBeInTheDocument();
    expect(mockRefetch).not.toHaveBeenCalled();
  });

  it('refetches connectors and closes the setup flyout once a connector is created', () => {
    const { getByTestId, queryByTestId } = renderButton();

    fireEvent.click(getByTestId('addNewConnectorButton'));
    fireEvent.click(getByTestId('mockSetupCreate'));

    expect(mockRefetch).toHaveBeenCalledTimes(1);
    expect(queryByTestId('connectorSetupFlyout')).not.toBeInTheDocument();
  });

  it('is disabled with a disabled test subject when the user cannot create connectors', () => {
    mockUseAuthorization.mockReturnValue({ canCreateConnectors: false });

    const { getByTestId } = renderButton();

    expect(getByTestId('addNewConnectorButtonDisabled')).toBeDisabled();
  });
});
