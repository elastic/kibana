/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { ResolvedDestinationIndex } from '@kbn/streams-plugin/common';
import type { ResolvedIndicesStatus } from './state_machines/destinations_state_machine';
import {
  REMOTE_ELASTICSEARCH_TYPE,
  type DestinationViewModel,
  type ElasticsearchDestinationViewModel,
  type RemoteElasticsearchDestinationViewModel,
} from './types';
import { UnitDestinationFlyout } from './unit_destination_flyout';

// This test is about the details of a destination. The delivery section reads the page's services,
// the unit of the route and the time filter, none of which it sets up, and it has tests of its own.
// The same goes for the indices table, so the section only shows the props it was given.
jest.mock('./destination_delivery_section', () => ({
  DestinationDeliverySection: (props: Record<string, unknown>) => (
    <div data-test-subj="deliverySectionProps">{JSON.stringify(props)}</div>
  ),
}));
jest.mock('./destination_indices_table', () => ({ DestinationIndicesTable: () => null }));
jest.mock('../deferred_mount', () => ({
  DeferredMount: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
const mockUseDestinationIndexStats = jest.fn();
jest.mock('./destinations_context', () => ({
  useDestinationIndexStats: () => mockUseDestinationIndexStats(),
}));
const mockIsServerless = jest.fn(() => false);
jest.mock('../../../hooks/use_kibana', () => ({
  useKibana: () => ({ isServerless: mockIsServerless() }),
}));

const deliverySectionProps = () =>
  JSON.parse(screen.getByTestId('deliverySectionProps').textContent ?? '{}');

const renderFlyout = (
  destination: DestinationViewModel,
  indices: ResolvedDestinationIndex[] = [],
  indicesStatus: ResolvedIndicesStatus = 'ready'
) =>
  render(
    <I18nProvider>
      <UnitDestinationFlyout
        destination={destination}
        indices={indices}
        indicesStatus={indicesStatus}
        hasConnectedSource={false}
        onShowDestinationDetail={jest.fn()}
        onHideDestinationDetail={jest.fn()}
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
  description: 'Long-term copy',
};

describe('UnitDestinationFlyout', () => {
  beforeEach(() => {
    mockUseDestinationIndexStats.mockReturnValue({ status: 'loading' });
    mockIsServerless.mockReturnValue(false);
  });

  it('shows remote details with no indices list', () => {
    renderFlyout(remoteDestination);

    const flyout = within(screen.getByTestId('streamsUnitDestinationFlyout'));
    expect(flyout.getByRole('heading', { name: 'Backup' })).toBeInTheDocument();
    expect(flyout.getByText('Long-term copy')).toBeInTheDocument();
    expect(flyout.getByRole('heading', { name: 'Configuration' })).toBeInTheDocument();
    const details = within(flyout.getByTestId('streamsRemoteElasticsearchDestinationDetails'));
    expect(details.getByText('https://my-cluster.es.example.com')).toBeInTheDocument();
    expect(details.getByText('remote-logs')).toBeInTheDocument();
    expect(details.getByText('remote-metrics')).toBeInTheDocument();
    expect(details.getByText('Configured')).toBeInTheDocument();
    expect(flyout.queryByTestId('streamsUnitDestinationIndexCount')).not.toBeInTheDocument();
  });

  describe('a local Elasticsearch destination in Auto mode', () => {
    const autoDestination: ElasticsearchDestinationViewModel = {
      id: 'es-auto',
      name: 'Auto',
      type: 'elasticsearch',
      signals: ['logs', 'metrics', 'traces'],
      mode: 'auto',
      indexBySignal: {},
      writePatternsBySignal: {},
    };

    const dataStreamIndex = (name: string): ResolvedDestinationIndex => ({
      name,
      documents: 10,
      ingestion_rate: 1,
      is_data_stream: true,
      lifecycle: { dsl: {} },
      failure_store_enabled: true,
      privileges: { read_failure_store: true },
    });

    it('totals what the indices it wrote to were written and store, so it adds up with them', () => {
      mockUseDestinationIndexStats.mockReturnValue({
        status: 'ready',
        stats: { storageBytes: { 'logs-a.otel-default': 1000, 'logs-b.otel-default': 24 } },
      });
      renderFlyout(autoDestination, [
        dataStreamIndex('logs-a.otel-default'),
        dataStreamIndex('logs-b.otel-default'),
      ]);

      expect(deliverySectionProps()).toEqual({
        destinationId: 'es-auto',
        destinationType: 'elasticsearch',
        totals: {
          documents: { count: 20, loading: false },
          storage: { bytes: 1024, loading: false },
        },
      });
      expect(screen.getByTestId('streamsUnitDestinationIndexCount')).toHaveTextContent('2 indices');
    });

    it('shows the totals as loading while the indices reload, as the previous ones are of another range', () => {
      mockUseDestinationIndexStats.mockReturnValue({ status: 'ready', stats: {} });
      renderFlyout(autoDestination, [dataStreamIndex('logs-a.otel-default')], 'loading');

      expect(deliverySectionProps().totals).toEqual({
        documents: { loading: true },
        storage: { loading: true },
      });
    });

    it('leaves the documents unknown when the indices could not be resolved', () => {
      renderFlyout(autoDestination, [], 'unavailable');

      expect(deliverySectionProps().totals.documents).toEqual({ loading: false });
    });

    it('leaves the storage unknown when it wrote to a regular index, which has no storage stats', () => {
      mockUseDestinationIndexStats.mockReturnValue({
        status: 'ready',
        stats: { storageBytes: { 'logs-a.otel-default': 1000 } },
      });
      renderFlyout(autoDestination, [
        dataStreamIndex('logs-a.otel-default'),
        { name: 'logs-regular', documents: 5, ingestion_rate: 0.5, is_data_stream: false },
      ]);

      expect(deliverySectionProps().totals.storage).toEqual({ loading: false });
    });

    it('shows no storage on serverless', () => {
      mockIsServerless.mockReturnValue(true);
      renderFlyout(autoDestination);

      expect(deliverySectionProps().totals).toEqual({ documents: { count: 0, loading: false } });
      expect(screen.getByTestId('streamsUnitDestinationIndexCount')).toHaveTextContent('0 indices');
    });
  });
});
