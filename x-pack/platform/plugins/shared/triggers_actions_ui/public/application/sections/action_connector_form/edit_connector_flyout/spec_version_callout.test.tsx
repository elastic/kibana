/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { I18nProvider } from '@kbn/i18n-react';
import type { ActionConnector } from '../../../../types';
import { useKibana } from '../../../../common/lib/kibana';
import { loadActionTypes, updateActionConnector } from '../../../lib/action_connector_api';
import { SpecVersionCallout } from './spec_version_callout';

jest.mock('../../../../common/lib/kibana');
jest.mock('../../../lib/action_connector_api', () => ({
  loadActionTypes: jest.fn(),
  updateActionConnector: jest.fn(),
}));

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;
const loadActionTypesMock = loadActionTypes as jest.Mock;
const updateMock = updateActionConnector as jest.Mock;

const connector = {
  id: 'c1',
  actionTypeId: '.abuseipdb',
  name: 'Pinned',
  config: { baseUrl: 'http://example.test' },
  secrets: { Key: 'k' },
  isPreconfigured: false,
  isDeprecated: false,
  isSystemAction: false,
  isConnectorTypeDeprecated: false,
  specVersion: '1.0',
} as unknown as ActionConnector;

const currentValues = {
  name: connector.name,
  config: { baseUrl: 'http://example.test' },
  secrets: { Key: 'k' },
};

const renderCallout = (props: Partial<React.ComponentProps<typeof SpecVersionCallout>> = {}) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <SpecVersionCallout
          connector={connector}
          canUpgrade
          currentValues={currentValues}
          onConnectorUpdated={jest.fn()}
          onValidationFailure={jest.fn()}
          {...props}
        />
      </QueryClientProvider>
    </I18nProvider>
  );
};

describe('SpecVersionCallout', () => {
  const addSuccess = jest.fn();
  const addError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useKibanaMock().services.notifications.toasts.addSuccess = addSuccess;
    useKibanaMock().services.notifications.toasts.addError = addError;
  });

  it('renders nothing when the connector runs on the latest version', async () => {
    loadActionTypesMock.mockResolvedValue([
      { id: '.abuseipdb', specVersion: '1.0', specVersions: { '1': '1.0' } },
    ]);
    renderCallout();
    await waitFor(() => expect(loadActionTypesMock).toHaveBeenCalled());
    expect(screen.queryByTestId('connector-spec-version-callout')).not.toBeInTheDocument();
  });

  it('shows same-major copy and PUTs spec_version', async () => {
    loadActionTypesMock.mockResolvedValue([
      { id: '.abuseipdb', specVersion: '1.1', specVersions: { '1': '1.1' } },
    ]);
    updateMock.mockResolvedValue({ ...connector, specVersion: '1.1' });
    const onConnectorUpdated = jest.fn();
    renderCallout({ onConnectorUpdated });
    expect(await screen.findByTestId('connector-spec-version-callout')).toHaveTextContent(
      'A newer connector version is available'
    );
    expect(screen.getByTestId('connector-spec-version-upgrade')).toHaveTextContent('Update to 1.1');
    await userEvent.click(screen.getByTestId('connector-spec-version-upgrade'));
    await waitFor(() =>
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'c1',
          connector: expect.objectContaining({ specVersion: '1.1' }),
        })
      )
    );
    expect(onConnectorUpdated).toHaveBeenCalled();
  });

  it('shows new-major copy', async () => {
    loadActionTypesMock.mockResolvedValue([
      { id: '.abuseipdb', specVersion: '2.0', specVersions: { '1': '1.1', '2': '2.0' } },
    ]);
    renderCallout();
    expect(await screen.findByTestId('connector-spec-version-callout')).toHaveTextContent(
      'Version 2 available, configuration may need changes'
    );
  });

  it('disables the button while the form has unsaved changes', async () => {
    loadActionTypesMock.mockResolvedValue([
      { id: '.abuseipdb', specVersion: '1.1', specVersions: { '1': '1.1' } },
    ]);
    renderCallout({ canUpgrade: false });
    expect(await screen.findByTestId('connector-spec-version-upgrade')).toBeDisabled();
  });

  it('calls onValidationFailure on a 400', async () => {
    loadActionTypesMock.mockResolvedValue([
      { id: '.abuseipdb', specVersion: '1.1', specVersions: { '1': '1.1' } },
    ]);
    const onValidationFailure = jest.fn();
    updateMock.mockRejectedValue(
      Object.assign(new Error('Bad Request'), {
        body: { message: 'config does not validate', statusCode: 400 },
      })
    );
    renderCallout({ onValidationFailure });
    await userEvent.click(await screen.findByTestId('connector-spec-version-upgrade'));
    await waitFor(() => expect(onValidationFailure).toHaveBeenCalledWith('1.1'));
    expect(addError).toHaveBeenCalled();
  });
});
