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

describe('Transform: Transform List <TransformList />', () => {
  test('Minimal initialization', async () => {
    const { container } = render(
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

    await waitFor(() => {
      expect(useQueryMock).toHaveBeenCalledTimes(5);
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
    expect(screen.getByTestId('transformBulkActionsMenuButton')).toHaveTextContent('1 selected');
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
    await userEvent.click(await screen.findByRole('option', { name: 'Latest' }));

    expect(await screen.findByText('latest-transform')).toBeInTheDocument();
    expect(screen.queryByText(pivotTransform.id)).not.toBeInTheDocument();
  });
});
