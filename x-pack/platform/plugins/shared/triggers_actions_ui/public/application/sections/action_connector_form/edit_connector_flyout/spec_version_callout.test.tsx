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
import { loadActionTypes, upgradeActionConnector } from '../../../lib/action_connector_api';
import { SpecVersionCallout } from './spec_version_callout';

jest.mock('../../../../common/lib/kibana');
jest.mock('../../../lib/action_connector_api', () => ({
  loadActionTypes: jest.fn(),
  upgradeActionConnector: jest.fn(),
}));

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;
const loadActionTypesMock = loadActionTypes as jest.Mock;
const upgradeMock = upgradeActionConnector as jest.Mock;

const connector = {
  id: 'c1',
  actionTypeId: '.abuseipdb',
  name: 'Pinned',
  config: {},
  secrets: {},
  isPreconfigured: false,
  isDeprecated: false,
  isSystemAction: false,
  isConnectorTypeDeprecated: false,
  specVersion: '1.0.0',
} as unknown as ActionConnector;

const renderCallout = (props: Partial<React.ComponentProps<typeof SpecVersionCallout>> = {}) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <SpecVersionCallout
          connector={connector}
          canUpgrade
          onConnectorUpdated={jest.fn()}
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

  it('renders nothing when the connector runs on the active version', async () => {
    loadActionTypesMock.mockResolvedValue([{ id: '.abuseipdb', specVersion: '1.0.0' }]);

    renderCallout();

    await waitFor(() => expect(loadActionTypesMock).toHaveBeenCalled());
    expect(screen.queryByTestId('connector-spec-version-callout')).not.toBeInTheDocument();
  });

  it('offers the upgrade when the catalog-active version differs and reloads the connector', async () => {
    loadActionTypesMock.mockResolvedValue([{ id: '.abuseipdb', specVersion: '1.1.0' }]);
    upgradeMock.mockResolvedValue({ ...connector, specVersion: '1.1.0' });
    const onConnectorUpdated = jest.fn();

    renderCallout({ onConnectorUpdated });

    expect(await screen.findByTestId('connector-spec-version-callout')).toHaveTextContent(
      'spec version 1.0.0'
    );
    await userEvent.click(screen.getByTestId('connector-spec-version-upgrade'));

    await waitFor(() =>
      expect(upgradeMock).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'c1', specVersion: '1.1.0' })
      )
    );
    expect(onConnectorUpdated).toHaveBeenCalledWith(
      expect.objectContaining({ specVersion: '1.1.0' })
    );
    expect(addSuccess).toHaveBeenCalled();
  });

  it('disables the upgrade while the form has unsaved changes', async () => {
    loadActionTypesMock.mockResolvedValue([{ id: '.abuseipdb', specVersion: '1.1.0' }]);

    renderCallout({ canUpgrade: false });

    expect(await screen.findByTestId('connector-spec-version-upgrade')).toBeDisabled();
  });

  it('shows an error toast when the upgrade is rejected', async () => {
    loadActionTypesMock.mockResolvedValue([{ id: '.abuseipdb', specVersion: '1.1.0' }]);
    upgradeMock.mockRejectedValue(
      Object.assign(new Error('Bad Request'), { body: { message: 'config does not validate' } })
    );

    renderCallout();

    await userEvent.click(await screen.findByTestId('connector-spec-version-upgrade'));

    await waitFor(() =>
      expect(addError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ toastMessage: 'config does not validate' })
      )
    );
  });
});
