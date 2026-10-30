/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { REMOTE_ELASTICSEARCH_TYPE, type RemoteElasticsearchDestinationViewModel } from './types';
import { UnitDestinationFlyout } from './unit_destination_flyout';

const renderFlyout = (destination: RemoteElasticsearchDestinationViewModel) =>
  render(
    <I18nProvider>
      <UnitDestinationFlyout
        destination={destination}
        indices={[]}
        indicesStatus="ready"
        onClose={jest.fn()}
        onDelete={jest.fn()}
        onIndexClick={jest.fn()}
      />
    </I18nProvider>
  );

const remoteDestination: RemoteElasticsearchDestinationViewModel = {
  id: 'backup',
  name: 'Backup',
  type: REMOTE_ELASTICSEARCH_TYPE,
  signals: ['logs', 'metrics'],
  endpoint: 'https://my-cluster.es.example.com',
  mode: 'static',
  indexBySignal: { logs: 'remote-logs', metrics: 'remote-metrics' },
};

describe('UnitDestinationFlyout', () => {
  it('shows remote details with no indices list', () => {
    renderFlyout(remoteDestination);

    const flyout = within(screen.getByTestId('streamsUnitDestinationFlyout'));
    expect(flyout.getByRole('heading', { name: 'Backup' })).toBeInTheDocument();
    const details = within(flyout.getByTestId('streamsRemoteElasticsearchDestinationDetails'));
    expect(details.getByText('https://my-cluster.es.example.com')).toBeInTheDocument();
    expect(details.getByText('remote-logs')).toBeInTheDocument();
    expect(details.getByText('remote-metrics')).toBeInTheDocument();
    expect(details.getByText('Configured')).toBeInTheDocument();
    expect(flyout.queryByText(/Routed into/)).not.toBeInTheDocument();
  });
});
