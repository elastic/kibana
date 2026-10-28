/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  DESTINATION_GRID_COLUMNS,
  DestinationsGrid,
  getDestinationSortableValue,
} from './destinations_grid';
import { toDestinationViewModel } from './destination_models';
import { createRemoteElasticsearchUnitDestination } from './remote_elasticsearch_destination_models';
import type {
  DestinationViewModel,
  ElasticsearchDestinationFormData,
  ElasticsearchDestinationViewModel,
  S3DestinationViewModel,
} from './types';

const mockUseDestinationIndexStats = jest.fn((_options: { enabled: boolean }) => ({}));
jest.mock('./use_destination_index_stats', () => ({
  useDestinationIndexStats: (options: { enabled: boolean }) =>
    mockUseDestinationIndexStats(options),
}));
jest.mock('./destination_indices_table', () => ({
  DestinationIndicesTable: () => null,
}));

const destination = (
  partial: Partial<ElasticsearchDestinationViewModel> = {}
): ElasticsearchDestinationViewModel => ({
  id: 'es-logs',
  name: 'Prod logs',
  type: 'elasticsearch',
  signals: ['logs'],
  mode: 'auto',
  ...partial,
});

describe('getDestinationSortableValue', () => {
  it('sorts the indices column by targeted index count', () => {
    expect(getDestinationSortableValue(destination(), 'indices', 3)).toBe(3);
    expect(getDestinationSortableValue(destination(), 'indices')).toBe(0);
  });

  it('keeps name and type sortable from the destination itself', () => {
    expect(getDestinationSortableValue(destination(), 'name')).toBe('Prod logs');
    expect(getDestinationSortableValue(destination(), 'type')).toBe('Local Elasticsearch');
  });
});

describe('DestinationsGrid', () => {
  const s3Destination: S3DestinationViewModel = {
    id: 'archive',
    name: 'Archive',
    type: 's3',
    signals: ['logs'],
    bucket: 'my-archive',
    region: 'eu-west-1',
    prefix: 'otel/',
  };

  const remoteDestination = (
    routing: Partial<ElasticsearchDestinationFormData> = {}
  ): DestinationViewModel => {
    const viewModel = toDestinationViewModel(
      createRemoteElasticsearchUnitDestination({
        id: 'backup',
        name: 'Backup',
        endpoint: 'https://my-cluster.es.example.com:9243',
        auto: true,
        logsIndex: '',
        metricsIndex: '',
        tracesIndex: '',
        ...routing,
      })
    );
    if (!viewModel) {
      throw new Error('Expected a remote view model');
    }
    return viewModel;
  };

  const renderGrid = (destinations: DestinationViewModel[]) =>
    render(
      <DestinationsGrid
        status="ready"
        destinations={destinations}
        resolvedIndicesByDestination={{}}
        resolvedIndicesStatus="ready"
        hasActiveFilters={false}
        visibleColumns={DESTINATION_GRID_COLUMNS.map(({ id }) => id)}
        pagination={{ pageIndex: 0, pageSize: 10 }}
        sortingColumns={[]}
        onVisibleColumnsChange={jest.fn()}
        onPaginationChange={jest.fn()}
        onSortingChange={jest.fn()}
        onShowOnCanvas={jest.fn()}
        onRequestDelete={jest.fn()}
      />
    );

  const isStatsEnabled = () => mockUseDestinationIndexStats.mock.lastCall?.[0].enabled;

  beforeEach(() => {
    mockUseDestinationIndexStats.mockClear();
  });

  it('expands an S3 row to show its bucket, region, prefix and key status', async () => {
    renderGrid([s3Destination]);

    await userEvent.click(screen.getByRole('button', { name: 'Expand details for Archive' }));

    const details = within(screen.getByTestId('streamsS3DestinationDetails'));
    expect(details.getByText('my-archive')).toBeInTheDocument();
    expect(details.getByText('eu-west-1')).toBeInTheDocument();
    expect(details.getByText('otel/')).toBeInTheDocument();
    expect(details.getAllByText('Configured')).toHaveLength(2);
    expect(details.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('does not fetch index stats when only an S3 row is expanded', async () => {
    renderGrid([s3Destination, destination()]);

    await userEvent.click(screen.getByRole('button', { name: 'Expand details for Archive' }));

    expect(isStatsEnabled()).toBe(false);
  });

  it('fetches index stats once an Elasticsearch row is expanded', async () => {
    renderGrid([s3Destination, destination()]);

    await userEvent.click(screen.getByRole('button', { name: 'Expand indices for Prod logs' }));

    expect(isStatsEnabled()).toBe(true);
  });

  const getCell = (container: HTMLElement, columnId: string) => {
    const cell = container.querySelector<HTMLElement>(
      `[data-gridcell-column-id="${columnId}"][data-gridcell-row-index="0"]`
    );
    if (!cell) {
      throw new Error(`No ${columnId} cell rendered`);
    }
    return cell;
  };

  it('shows a remote row as Remote Elasticsearch with no index count', () => {
    const { container } = renderGrid([remoteDestination()]);

    expect(
      within(getCell(container, 'type')).getByText('Remote Elasticsearch')
    ).toBeInTheDocument();
    expect(within(getCell(container, 'indices')).getByText('-')).toBeInTheDocument();
    expect(screen.queryByTestId('streamsDestinationIndexCountBadge')).not.toBeInTheDocument();
  });

  it('does not fetch index stats when only a remote row is expanded', async () => {
    renderGrid([remoteDestination(), destination()]);

    await userEvent.click(screen.getByRole('button', { name: 'Expand details for Backup' }));

    expect(isStatsEnabled()).toBe(false);
  });

  it('expands a remote Auto row to show its endpoint, routing and key status', async () => {
    renderGrid([remoteDestination()]);

    await userEvent.click(screen.getByRole('button', { name: 'Expand details for Backup' }));

    const details = within(screen.getByTestId('streamsRemoteElasticsearchDestinationDetails'));
    expect(details.getByText('https://my-cluster.es.example.com:9243')).toBeInTheDocument();
    expect(details.getByText('Routing')).toBeInTheDocument();
    expect(details.getByText('Auto')).toBeInTheDocument();
    expect(details.getByText('API key')).toBeInTheDocument();
    expect(details.getByText('Configured')).toBeInTheDocument();
    expect(details.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('expands a remote Fixed row to show each signal and its index', async () => {
    renderGrid([
      remoteDestination({ auto: false, logsIndex: 'remote-logs', tracesIndex: 'remote-traces' }),
    ]);

    await userEvent.click(screen.getByRole('button', { name: 'Expand details for Backup' }));

    const details = within(screen.getByTestId('streamsRemoteElasticsearchDestinationDetails'));
    expect(details.getByText('Fixed index per signal')).toBeInTheDocument();
    expect(details.getByText('Logs')).toBeInTheDocument();
    expect(details.getByText('remote-logs')).toBeInTheDocument();
    expect(details.getByText('Traces')).toBeInTheDocument();
    expect(details.getByText('remote-traces')).toBeInTheDocument();
    expect(details.queryByText('Metrics')).not.toBeInTheDocument();
    expect(details.queryByText('Auto')).not.toBeInTheDocument();
  });
});
