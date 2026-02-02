/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { FunctionComponent } from 'react';
import type { EuiDataGridColumn } from '@elastic/eui';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { BrowserFields } from '@kbn/alerting-types';
import { testQueryClientConfig } from '@kbn/alerts-ui-shared/src/common/test_utils/test_query_client_config';
import { AlertsQueryContext } from '@kbn/alerts-ui-shared/src/common/contexts/alerts_query_context';
import { useColumns } from './use_columns';

const queryClient = new QueryClient(testQueryClientConfig);

const wrapper: FunctionComponent<React.PropsWithChildren<{}>> = ({ children }) => (
  <QueryClientProvider client={queryClient} context={AlertsQueryContext}>
    {children}
  </QueryClientProvider>
);

const alertsFields: BrowserFields = {
  kibana: {
    fields: {
      ['event.action']: {
        category: 'event',
        name: 'event.action',
        type: 'string',
      },
      ['@timestamp']: {
        category: 'base',
        name: '@timestamp',
        type: 'date',
      },
      ['kibana.alert.duration.us']: {
        category: 'kibana',
        name: 'kibana.alert.duration.us',
        type: 'number',
      },
      ['kibana.alert.reason']: {
        category: 'kibana',
        name: 'kibana.alert.reason',
        type: 'string',
      },
    },
  },
};

describe('useColumns', () => {
  const defaultColumns: EuiDataGridColumn[] = [
    {
      id: 'event.action',
      displayAsText: 'Alert status',
      initialWidth: 150,
      schema: 'string',
    },
    {
      id: '@timestamp',
      displayAsText: 'Last updated',
      initialWidth: 250,
      schema: 'datetime',
    },
    {
      id: 'kibana.alert.duration.us',
      displayAsText: 'Duration',
      initialWidth: 150,
      schema: 'numeric',
    },
    {
      id: 'kibana.alert.reason',
      displayAsText: 'Reason',
      initialWidth: 260,
      schema: 'string',
    },
  ];
  const defaultVisibleColumns = defaultColumns.map((col) => col.id);

  describe('columns', () => {
    it('should remove initialWidth from last column to make it fill the available space', async () => {
      const columns = [...defaultColumns];
      const visibleColumns = columns.map((col) => col.id);
      const setColumns = jest.fn();
      const setVisibleColumns = jest.fn();
      const { result } = renderHook(
        () =>
          useColumns({
            columns,
            updateColumns: setColumns,
            defaultColumns,
            visibleColumns,
            updateVisibleColumns: setVisibleColumns,
            defaultVisibleColumns,
            alertsFields,
          }),
        { wrapper }
      );

      const columnsWithFieldsData = result.current.columnsWithFieldsData;
      const lastVisibleColumnId = visibleColumns[visibleColumns.length - 1];
      const lastVisibleColumn = columnsWithFieldsData.find((col) => col.id === lastVisibleColumnId);
      expect(lastVisibleColumn).not.toHaveProperty('initialWidth');
    });

    it('should add isSortable flag to columns', async () => {
      const columns = [...defaultColumns, { id: 'test', displayAsText: 'test' }];
      const visibleColumns = columns.map((col) => col.id);
      const setColumns = jest.fn();
      const setVisibleColumns = jest.fn();
      const { result } = renderHook(
        () =>
          useColumns({
            columns,
            updateColumns: setColumns,
            defaultColumns,
            visibleColumns,
            updateVisibleColumns: setVisibleColumns,
            defaultVisibleColumns,
            alertsFields,
          }),
        { wrapper }
      );

      await waitFor(() =>
        expect(result.current.columnsWithFieldsData).toMatchObject([
          ...defaultColumns,
          { id: 'test', isSortable: false },
        ])
      );
    });
  });

  describe('onResetColumns', () => {
    it('should restore the columns to their default value', () => {
      let columns = [...defaultColumns];
      let visibleColumns = columns.map((col) => col.id);
      const setColumns = jest.fn((updater) => {
        columns = typeof updater === 'function' ? updater(columns) : updater;
      });
      const setVisibleColumns = jest.fn((updater) => {
        visibleColumns = typeof updater === 'function' ? updater(visibleColumns) : updater;
      });

      const { result } = renderHook(
        () =>
          useColumns({
            columns,
            updateColumns: setColumns,
            defaultColumns,
            visibleColumns,
            updateVisibleColumns: setVisibleColumns,
            defaultVisibleColumns,
          }),
        { wrapper }
      );
      expect(visibleColumns).toEqual([
        'event.action',
        '@timestamp',
        'kibana.alert.duration.us',
        'kibana.alert.reason',
      ]);
      act(() => {
        result.current.onToggleColumn(defaultColumns[0].id);
      });

      expect(visibleColumns).not.toContain('event.action');
      act(() => {
        result.current.onResetColumns();
      });
      expect(visibleColumns).toEqual([
        'event.action',
        '@timestamp',
        'kibana.alert.duration.us',
        'kibana.alert.reason',
      ]);
    });
  });

  describe('onToggleColumn', () => {
    it('should correctly update columns and visibleColumns when toggling off a column', () => {
      let columns = [...defaultColumns];
      let visibleColumns = columns.map((col) => col.id);
      const setColumns = jest.fn((updater) => {
        columns = updater(columns);
      });
      const setVisibleColumns = jest.fn((updater) => {
        visibleColumns = typeof updater === 'function' ? updater(visibleColumns) : updater;
      });
      const { result } = renderHook(
        () =>
          useColumns({
            columns,
            updateColumns: setColumns,
            defaultColumns,
            visibleColumns,
            updateVisibleColumns: setVisibleColumns,
            defaultVisibleColumns,
          }),
        { wrapper }
      );
      act(() => {
        result.current.onToggleColumn(defaultColumns[0].id);
      });
      const expectedColumns = [...defaultColumns].slice(1);
      expect(columns).toMatchObject(expectedColumns);
      expect(visibleColumns).toEqual(expectedColumns.map((col) => col.id));
    });

    it('should correctly update columns and visibleColumns when toggling on a column', () => {
      let columns = [...defaultColumns].slice(1);
      let visibleColumns = columns.map((col) => col.id);
      const setColumns = jest.fn((updater) => {
        columns = updater(columns);
      });
      const setVisibleColumns = jest.fn((updater) => {
        visibleColumns = typeof updater === 'function' ? updater(visibleColumns) : updater;
      });
      const { result } = renderHook(
        () =>
          useColumns({
            columns,
            updateColumns: setColumns,
            defaultColumns,
            visibleColumns,
            updateVisibleColumns: setVisibleColumns,
            defaultVisibleColumns,
          }),
        { wrapper }
      );
      act(() => {
        result.current.onToggleColumn(defaultColumns[0].id);
      });
      const expectedColumns = [...defaultColumns];
      expect(columns).toMatchObject(expectedColumns);
      expect(visibleColumns).toEqual(expectedColumns.map((col) => col.id));
    });
  });

  describe('onColumnResize', () => {
    it("should update the columns state changing the resized column's initialWidth", async () => {
      let columns = [...defaultColumns];
      const setColumnsMock = jest.fn((updater) => {
        columns = updater(columns);
      });
      const { result, rerender } = renderHook(
        () =>
          useColumns({
            columns,
            updateColumns: setColumnsMock,
            defaultColumns,
            visibleColumns: columns.map((col) => col.id),
            updateVisibleColumns: jest.fn(),
            defaultVisibleColumns,
            alertsFields,
          }),
        { wrapper }
      );

      await act(async () => {
        result.current.onColumnResize({ columnId: '@timestamp', width: 100 });
      });

      rerender();

      expect(columns.find((c) => c.id === '@timestamp')).toEqual({
        displayAsText: 'Last updated',
        id: '@timestamp',
        initialWidth: 100,
        schema: 'datetime',
      });
    });
  });
});
