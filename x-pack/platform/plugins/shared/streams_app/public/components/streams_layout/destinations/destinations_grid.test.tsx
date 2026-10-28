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
import type { ElasticsearchDestinationViewModel, S3DestinationViewModel } from './types';

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

  const renderGrid = (
    destinations: Array<ElasticsearchDestinationViewModel | S3DestinationViewModel>
  ) =>
    render(
      <DestinationsGrid
        status="ready"
        destinations={destinations}
        resolvedIndicesByDestination={{}}
        resolvedIndicesStatus="ready"
        destinationDetailRefs={{}}
        onRequestIndexStats={jest.fn()}
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
});
