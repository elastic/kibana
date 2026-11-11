/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@kbn/react-query/mock';
import { QueryClient, QueryClientProvider, type UseQueryResult } from '@kbn/react-query';
import * as ReactQuery from '@kbn/react-query';

import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type { ListingPageUrlState } from '@kbn/ml-url-state';

import { getInitialTransformCapabilities } from '../../../../../../common/types/capabilities';
import { useAppDependencies } from '../../../../app_dependencies';

import { TransformList } from './transform_list';
import type { TransformListRow } from '../../../../common';
import transformListRow from '../../../../common/__mocks__/transform_list_row.json';

const useQueryMock = jest.spyOn(ReactQuery, 'useQuery').mockImplementation((queryKey) => {
  switch (queryKey[0]) {
    case 'transform.data_view_exists':
      return { error: null, data: true } as UseQueryResult<unknown, unknown>;
  }

  return { error: null, data: undefined } as UseQueryResult<unknown, unknown>;
});

const queryClient = new QueryClient();

jest.mock('../../../../app_dependencies');
jest.mock('../../../../hooks/use_get_transform_cps_enabled', () => ({
  useGetTransformCpsEnabled: () => ({ data: true }),
}));
jest.mock('../../../../serverless_context', () => ({
  useEnabledFeatures: () => ({ showNodeInfo: false }),
}));

const renderEmptyList = () =>
  render(
    <IntlProvider locale="en">
      <QueryClientProvider client={queryClient}>
        <TransformList
          isLoading={false}
          onCreateTransform={jest.fn()}
          transformNodes={1}
          transforms={[]}
          transformsLoading={false}
          transformsStatsLoading={false}
          pageState={{ pageSize: 10, pageIndex: 0, sortField: 'id', sortDirection: 'asc' }}
          updatePageState={jest.fn()}
        />
      </QueryClientProvider>
    </IntlProvider>
  );

describe('Transform: Transform List <TransformList />', () => {
  afterEach(() => {
    Object.assign(useAppDependencies().application.capabilities, { transform: undefined });
  });

  test('Minimal initialization', async () => {
    const { container } = renderEmptyList();

    await waitFor(() => {
      expect(useQueryMock).toHaveBeenCalledTimes(4);
      expect(container.textContent).toContain('Create your first transform');
    });
  });

  test('replaces the filtered summary with bulk actions when a row is selected', async () => {
    const item = transformListRow as unknown as TransformListRow;
    render(
      <IntlProvider locale="en">
        <QueryClientProvider client={queryClient}>
          <TransformList
            isLoading={false}
            onCreateTransform={jest.fn()}
            transformNodes={1}
            transforms={[item]}
            transformsLoading={false}
            transformsStatsLoading={false}
            pageState={{ pageSize: 10, pageIndex: 0, sortField: 'id', sortDirection: 'asc' }}
            updatePageState={jest.fn()}
          />
        </QueryClientProvider>
      </IntlProvider>
    );

    expect(await screen.findByTestId('transformStatsBar')).toHaveTextContent(
      'Showing 1–1 of 1 transform'
    );
    const checkboxes = screen.getAllByRole('checkbox');
    await userEvent.click(checkboxes[1]);

    expect(screen.queryByTestId('transformStatsBar')).not.toBeInTheDocument();
    const bulkActionsButton = screen.getByTestId('transformBulkActionsMenuButton');
    expect(bulkActionsButton).toHaveTextContent('1 selected');

    await userEvent.click(bulkActionsButton);

    expect(screen.getByRole('menuitem', { name: 'Schedule now' })).toBeInTheDocument();

    await userEvent.click(bulkActionsButton);
    await waitFor(() => {
      expect(screen.queryByRole('menuitem', { name: 'Schedule now' })).not.toBeInTheDocument();
    });
  });

  test('clears selected transforms that disappear from the list', async () => {
    const selectedTransform = {
      ...transformListRow,
      id: 'a-transform',
      config: { ...transformListRow.config, id: 'a-transform' },
    } as unknown as TransformListRow;
    const remainingTransform = {
      ...transformListRow,
      id: 'b-transform',
      config: { ...transformListRow.config, id: 'b-transform' },
    } as unknown as TransformListRow;
    const renderList = (transforms: TransformListRow[]) => (
      <IntlProvider locale="en">
        <QueryClientProvider client={queryClient}>
          <TransformList
            isLoading={false}
            onCreateTransform={jest.fn()}
            transformNodes={1}
            transforms={transforms}
            transformsLoading={false}
            transformsStatsLoading={false}
            pageState={{ pageSize: 10, pageIndex: 0, sortField: 'id', sortDirection: 'asc' }}
            updatePageState={jest.fn()}
          />
        </QueryClientProvider>
      </IntlProvider>
    );
    const { rerender } = render(renderList([selectedTransform, remainingTransform]));

    await userEvent.click(screen.getByRole('checkbox', { name: 'Select transform a-transform' }));
    expect(screen.getByTestId('transformBulkActionsMenuButton')).toHaveTextContent('1 selected');

    rerender(renderList([remainingTransform]));

    await waitFor(() => {
      expect(screen.queryByTestId('transformBulkActionsMenuButton')).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('transformStatsBar')).toHaveTextContent('Showing 1–1 of 1 transform');
  });

  test('keeps matching transforms selected and removes hidden transforms from selection', async () => {
    const transforms = ['a-transform', 'b-transform'].map(
      (id) =>
        ({
          ...transformListRow,
          id,
          config: { ...transformListRow.config, id },
        } as unknown as TransformListRow)
    );

    const TestHarness = () => {
      const [pageState, setPageState] = useState<ListingPageUrlState>({
        pageSize: 10,
        pageIndex: 0,
        sortField: 'id',
        sortDirection: 'asc',
      });

      return (
        <TransformList
          isLoading={false}
          onCreateTransform={jest.fn()}
          transformNodes={1}
          transforms={transforms}
          transformsLoading={false}
          transformsStatsLoading={false}
          pageState={pageState}
          updatePageState={(update) => setPageState((current) => ({ ...current, ...update }))}
        />
      );
    };

    render(
      <IntlProvider locale="en">
        <QueryClientProvider client={queryClient}>
          <TestHarness />
        </QueryClientProvider>
      </IntlProvider>
    );

    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Select all transforms on this page' })
    );
    expect(screen.getByTestId('transformBulkActionsMenuButton')).toHaveTextContent('2 selected');

    await userEvent.type(screen.getByRole('searchbox'), 'a-');

    await waitFor(() => {
      expect(screen.getByTestId('transformBulkActionsMenuButton')).toHaveTextContent('1 selected');
    });
    expect(screen.getByRole('checkbox', { name: 'Select transform a-transform' })).toBeChecked();
    expect(screen.queryByText('b-transform')).not.toBeInTheDocument();
  });

  test('filters transforms by type', async () => {
    const pivotTransform = transformListRow as unknown as TransformListRow;
    const latestTransform = {
      ...pivotTransform,
      id: 'latest-transform',
      config: {
        ...pivotTransform.config,
        id: 'latest-transform',
        latest: {
          unique_key: ['customer_id'],
          sort: '@timestamp',
        },
      },
    } as unknown as TransformListRow;

    const TestHarness = () => {
      const [pageState, setPageState] = useState<ListingPageUrlState>({
        pageSize: 10,
        pageIndex: 0,
        sortField: 'id',
        sortDirection: 'asc',
      });

      return (
        <TransformList
          isLoading={false}
          onCreateTransform={jest.fn()}
          transformNodes={1}
          transforms={[pivotTransform, latestTransform]}
          transformsLoading={false}
          transformsStatsLoading={false}
          pageState={pageState}
          updatePageState={(update) => setPageState((current) => ({ ...current, ...update }))}
        />
      );
    };

    render(
      <IntlProvider locale="en">
        <QueryClientProvider client={queryClient}>
          <TestHarness />
        </QueryClientProvider>
      </IntlProvider>
    );

    await userEvent.click(screen.getByRole('button', { name: 'Type Selection' }));
    expect(screen.getByText('Select transform type')).toBeInTheDocument();
    await userEvent.click(await screen.findByRole('option', { name: 'Latest' }));

    expect(await screen.findByText('latest-transform')).toBeInTheDocument();
    expect(screen.queryByText(pivotTransform.id)).not.toBeInTheDocument();
  });

  test('offers to select every filtered transform after selecting the current page', async () => {
    const transforms = Array.from({ length: 11 }, (_, index) => ({
      ...transformListRow,
      id: `transform-${index}`,
      config: {
        ...transformListRow.config,
        id: `transform-${index}`,
      },
    })) as unknown as TransformListRow[];

    render(
      <IntlProvider locale="en">
        <QueryClientProvider client={queryClient}>
          <TransformList
            isLoading={false}
            onCreateTransform={jest.fn()}
            transformNodes={1}
            transforms={transforms}
            transformsLoading={false}
            transformsStatsLoading={false}
            pageState={{ pageSize: 10, pageIndex: 0, sortField: 'id', sortDirection: 'asc' }}
            updatePageState={jest.fn()}
          />
        </QueryClientProvider>
      </IntlProvider>
    );

    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Select all transforms on this page' })
    );

    expect(screen.getByTestId('transformBulkActionsMenuButton')).toHaveTextContent('10 selected');
    const selectAllButton = screen.getByTestId('transformSelectAllButton');
    expect(selectAllButton).toHaveTextContent('Select all 11 transforms');

    await userEvent.click(selectAllButton);

    expect(screen.getByTestId('transformBulkActionsMenuButton')).toHaveTextContent('11 selected');
    expect(screen.getByTestId('transformClearSelectionButton')).toBeInTheDocument();
  });

  test.each([
    ['enables', true],
    ['disables', false],
  ])('%s the empty-state create button by transform capabilities', async (_, canManage) => {
    Object.assign(useAppDependencies().application.capabilities, {
      transform: getInitialTransformCapabilities(canManage),
    });

    renderEmptyList();

    expect(await screen.findByTestId('transformNoTransformsFound')).toBeInTheDocument();
    expect(screen.getByTestId('transformButtonCreate')).toHaveProperty('disabled', !canManage);
  });
});
