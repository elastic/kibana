/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, type PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, renderHook } from '@testing-library/react';

import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type { CoreSetup } from '@kbn/core/public';
import { DataGrid, type UseIndexDataReturnType, INDEX_STATUS } from '@kbn/ml-data-grid';
import type { RuntimeMappings } from '@kbn/ml-runtime-field-utils';
import type { SimpleQuery } from '@kbn/ml-query-utils';

import type { SearchItems } from './use_search_items';
import { useIndexData } from './use_index_data';

jest.mock('../app_dependencies');

const query: SimpleQuery = {
  query_string: {
    query: '*',
    default_operator: 'AND',
  },
};

const runtimeMappings: RuntimeMappings = {
  rt_bytes_bigger: {
    type: 'double',
    script: {
      source: "emit(doc['bytes'].value * 2.0)",
    },
  },
};

const queryClient = new QueryClient();

describe('Transform: useIndexData()', () => {
  test('empty populatedFields does not trigger loading', async () => {
    const wrapper: FC<PropsWithChildren<unknown>> = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        <IntlProvider locale="en">{children}</IntlProvider>
      </QueryClientProvider>
    );

    const { result } = renderHook(
      () =>
        useIndexData({
          dataView: {
            id: 'the-id',
            getIndexPattern: () => 'the-index-pattern',
            fields: [],
          } as unknown as SearchItems['dataView'],
          query,
          combinedRuntimeMappings: runtimeMappings,
          populatedFields: [],
        }),
      { wrapper }
    );

    await waitFor(() => {
      const IndexObj: UseIndexDataReturnType = result.current;

      expect(IndexObj.errorMessage).toBe('');
      expect(IndexObj.status).toBe(INDEX_STATUS.UNUSED);
      expect(IndexObj.tableItems).toEqual([]);
    });
  });

  test('dataView set triggers loading', async () => {
    const wrapper: FC<PropsWithChildren<unknown>> = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        <IntlProvider locale="en">{children}</IntlProvider>
      </QueryClientProvider>
    );

    const { result } = renderHook(
      () =>
        useIndexData({
          dataView: {
            id: 'the-id',
            getIndexPattern: () => 'the-index-pattern',
            metaFields: [],
            // minimal mock of DataView fields (array with getByName method)
            fields: new (class DataViewFields extends Array<{ name: string }> {
              getByName(id: string) {
                return this.find((d) => d.name === id);
              }
            })(
              {
                name: 'the-populated-field',
              },
              {
                name: 'the-unpopulated-field',
              }
            ),
          } as unknown as SearchItems['dataView'],
          query,
          combinedRuntimeMappings: runtimeMappings,
          populatedFields: ['the-populated-field'],
        }),
      { wrapper }
    );

    const IndexObj: UseIndexDataReturnType = result.current;

    await waitFor(() => {
      expect(IndexObj.errorMessage).toBe('');
      expect(IndexObj.status).toBe(INDEX_STATUS.LOADING);
      expect(IndexObj.tableItems).toEqual([]);
    });
  });
});

describe('Transform: <DataGrid /> with useIndexData()', () => {
  test('Minimal initialization, no cross cluster search warning.', async () => {
    // Arrange
    const dataView = {
      getIndexPattern: () => 'the-data-view-index-pattern',
      fields: [] as any[],
    } as SearchItems['dataView'];

    const Wrapper = () => {
      const props = {
        ...useIndexData({
          dataView,
          query: { match_all: {} },
          combinedRuntimeMappings: runtimeMappings,
          populatedFields: ['the-populated-field'],
        }),
        copyToClipboard: 'the-copy-to-clipboard-code',
        copyToClipboardDescription: 'the-copy-to-clipboard-description',
        dataTestSubj: 'the-data-test-subj',
        title: 'the-index-preview-title',
        toastNotifications: {} as CoreSetup['notifications']['toasts'],
      };

      return <DataGrid {...props} />;
    };

    render(
      <QueryClientProvider client={queryClient}>
        <IntlProvider locale="en">
          <Wrapper />
        </IntlProvider>
      </QueryClientProvider>
    );

    // Act
    // Assert
    await waitFor(() => {
      expect(screen.queryByText('the-index-preview-title')).toBeInTheDocument();
      expect(
        screen.queryByText('Cross-cluster search returned no fields data.')
      ).not.toBeInTheDocument();
    });
  });
});
