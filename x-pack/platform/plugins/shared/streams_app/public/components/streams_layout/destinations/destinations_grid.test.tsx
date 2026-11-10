/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  DESTINATION_GRID_COLUMNS,
  DestinationsGrid,
  getDestinationSortableValue,
} from './destinations_grid';
import {
  REMOTE_ELASTICSEARCH_TYPE,
  type DestinationViewModel,
  type ElasticsearchDestinationViewModel,
  type RemoteElasticsearchDestinationViewModel,
  type S3DestinationViewModel,
} from './types';

const mockDestinationIndicesTable = jest.fn((_props: { destinationId: string }) => null);
const mockIndicesTableMount = jest.fn((_destinationId: string) => undefined);
jest.mock('./destination_indices_table', () => {
  const { useEffect } = jest.requireActual<typeof import('react')>('react');
  return {
    DestinationIndicesTable: (props: { destinationId: string }) => {
      const { destinationId } = props;
      useEffect(() => {
        mockIndicesTableMount(destinationId);
      }, [destinationId]);
      return mockDestinationIndicesTable(props);
    },
  };
});

const destination = (
  partial: Partial<ElasticsearchDestinationViewModel> = {}
): ElasticsearchDestinationViewModel => ({
  id: 'es-logs',
  name: 'Prod logs',
  type: 'elasticsearch',
  signals: ['logs'],
  mode: 'auto',
  indexBySignal: {},
  writePatternsBySignal: {},
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
    partial: Partial<RemoteElasticsearchDestinationViewModel> = {}
  ): RemoteElasticsearchDestinationViewModel => ({
    id: 'backup',
    name: 'Backup',
    type: REMOTE_ELASTICSEARCH_TYPE,
    signals: ['logs', 'metrics', 'traces'],
    endpoint: 'https://my-cluster.es.example.com:9243',
    mode: 'auto',
    indexBySignal: {},
    ...partial,
  });

  const renderGrid = (destinations: DestinationViewModel[]) =>
    render(
      <DestinationsGrid
        status="ready"
        destinations={destinations}
        resolvedIndicesByDestination={new Map()}
        resolvedIndicesStatus="ready"
        destinationDetailRefs={new Map()}
        onShowDestinationDetail={jest.fn()}
        onHideDestinationDetail={jest.fn()}
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

  const renderedIndexTableIds = () =>
    mockDestinationIndicesTable.mock.calls.map(([{ destinationId }]) => destinationId);

  beforeEach(() => {
    mockDestinationIndicesTable.mockClear();
    mockIndicesTableMount.mockClear();
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

  it('does not render the indices table when only an S3 row is expanded', async () => {
    renderGrid([s3Destination, destination()]);

    await userEvent.click(screen.getByRole('button', { name: 'Expand details for Archive' }));

    expect(renderedIndexTableIds()).toEqual([]);
  });

  it('renders the indices table for an expanded Elasticsearch row', async () => {
    renderGrid([s3Destination, destination()]);

    await userEvent.click(screen.getByRole('button', { name: 'Expand indices for Prod logs' }));

    await waitFor(() => expect(new Set(renderedIndexTableIds())).toEqual(new Set(['es-logs'])));
  });

  it('keeps an expanded row mounted when another row is expanded', async () => {
    renderGrid([destination(), destination({ id: 'es-metrics', name: 'Prod metrics' })]);

    await userEvent.click(screen.getByRole('button', { name: 'Expand indices for Prod logs' }));
    await waitFor(() => expect(mockIndicesTableMount.mock.calls).toEqual([['es-logs']]));
    await userEvent.click(screen.getByRole('button', { name: 'Expand indices for Prod metrics' }));

    await waitFor(() =>
      expect(mockIndicesTableMount.mock.calls).toEqual([['es-logs'], ['es-metrics']])
    );
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
  });

  it('does not render the indices table when only a remote row is expanded', async () => {
    renderGrid([remoteDestination(), destination()]);

    await userEvent.click(screen.getByRole('button', { name: 'Expand details for Backup' }));

    expect(renderedIndexTableIds()).toEqual([]);
  });

  it('expands a remote Auto row to show its endpoint, routing and key status', async () => {
    renderGrid([remoteDestination()]);

    await userEvent.click(screen.getByRole('button', { name: 'Expand details for Backup' }));

    const details = within(screen.getByTestId('streamsRemoteElasticsearchDestinationDetails'));
    expect(details.getByText('https://my-cluster.es.example.com:9243')).toBeInTheDocument();
    expect(details.getByText('Routing')).toBeInTheDocument();
    expect(details.getByText('Auto (default)')).toBeInTheDocument();
    expect(details.getByText('API key')).toBeInTheDocument();
    expect(details.getByText('Configured')).toBeInTheDocument();
    expect(details.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('expands a remote Fixed row to show each signal and its index', async () => {
    renderGrid([
      remoteDestination({
        signals: ['logs', 'traces'],
        mode: 'static',
        indexBySignal: { logs: 'remote-logs', traces: 'remote-traces' },
      }),
    ]);

    await userEvent.click(screen.getByRole('button', { name: 'Expand details for Backup' }));

    const details = within(screen.getByTestId('streamsRemoteElasticsearchDestinationDetails'));
    expect(details.getByText('Fixed index per signal')).toBeInTheDocument();
    expect(details.getByText('Logs')).toBeInTheDocument();
    expect(details.getByText('remote-logs')).toBeInTheDocument();
    expect(details.getByText('Traces')).toBeInTheDocument();
    expect(details.getByText('remote-traces')).toBeInTheDocument();
    expect(details.queryByText('Metrics')).not.toBeInTheDocument();
    expect(details.queryByText('Auto (default)')).not.toBeInTheDocument();
  });
});
