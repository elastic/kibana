/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, type PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type { RuntimeMappings } from '@kbn/ml-runtime-field-utils';
import type { SimpleQuery } from '@kbn/ml-query-utils';

import type { SearchItems } from './use_search_items';
import { useIndexData } from './use_index_data';
import { useTransformConfigData } from './use_transform_config_data';

jest.mock('../app_dependencies');

const mockResetPagination = jest.fn();
const mockUseDataGrid = jest.fn();

jest.mock('@kbn/ml-data-grid', () => {
  const actual = jest.requireActual('@kbn/ml-data-grid');

  return {
    ...actual,
    useDataGrid: (...args: unknown[]) => mockUseDataGrid(...args),
  };
});

const query: SimpleQuery = {
  query_string: {
    query: '*',
    default_operator: 'AND',
  },
};

const runtimeMappings: RuntimeMappings = {};

class DataViewFields extends Array<{ name: string }> {
  getByName(id: string) {
    return this.find((d) => d.name === id);
  }
}

const dataView = {
  id: 'the-id',
  getIndexPattern: () => 'the-index-pattern',
  metaFields: [],
  fields: new DataViewFields({
    name: 'the-populated-field',
  }),
} as unknown as SearchItems['dataView'];

const createWrapper = (): FC<PropsWithChildren<unknown>> => {
  const queryClient = new QueryClient();

  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <IntlProvider locale="en">{children}</IntlProvider>
    </QueryClientProvider>
  );
};

const getMockDataGrid = () => ({
  chartsVisible: false,
  pagination: { pageIndex: 2, pageSize: 10 },
  resetPagination: mockResetPagination,
  setCcsWarning: jest.fn(),
  setColumnCharts: jest.fn(),
  setErrorMessage: jest.fn(),
  setNoDataMessage: jest.fn(),
  setRowCountInfo: jest.fn(),
  setStatus: jest.fn(),
  setTableItems: jest.fn(),
  sortingColumns: [],
  tableItems: [],
  visibleColumns: [],
});

describe('project routing pagination reset', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDataGrid.mockReturnValue(getMockDataGrid());
  });

  test('resets source document pagination when project routing changes', async () => {
    const { rerender } = renderHook(
      ({ projectRouting }: { projectRouting?: string }) =>
        useIndexData({
          dataView,
          query,
          combinedRuntimeMappings: runtimeMappings,
          populatedFields: ['the-populated-field'],
          projectRouting,
        }),
      {
        initialProps: { projectRouting: '_id:origin-id' },
        wrapper: createWrapper(),
      }
    );

    mockResetPagination.mockClear();
    rerender({ projectRouting: '_id:linked-id' });

    await waitFor(() => {
      expect(mockResetPagination).toHaveBeenCalledTimes(1);
    });
  });

  test('resets transform preview pagination when project routing changes', async () => {
    const { rerender } = renderHook(
      ({ projectRouting }: { projectRouting?: string }) =>
        useTransformConfigData(
          dataView,
          query,
          { isValid: true },
          {
            pivot: {
              group_by: {},
              aggregations: {},
            },
          },
          runtimeMappings,
          undefined,
          projectRouting
        ),
      {
        initialProps: { projectRouting: '_id:origin-id' },
        wrapper: createWrapper(),
      }
    );

    mockResetPagination.mockClear();
    rerender({ projectRouting: '_id:linked-id' });

    await waitFor(() => {
      expect(mockResetPagination).toHaveBeenCalledTimes(1);
    });
  });
});
