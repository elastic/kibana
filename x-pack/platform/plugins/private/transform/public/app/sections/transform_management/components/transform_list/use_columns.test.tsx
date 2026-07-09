/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, type PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { screen, waitFor, renderHook } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import type { TransformListRow } from '../../../../common';

import { useColumns } from './use_columns';

import transformListRow from '../../../../common/__mocks__/transform_list_row.json';

jest.mock('../../../../app_dependencies');

describe('Transform: Job List Columns', () => {
  test('useColumns()', async () => {
    const queryClient = new QueryClient();
    const wrapper: FC<PropsWithChildren<unknown>> = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useColumns([], () => {}, 1, [], false), {
      wrapper,
    });

    await waitFor(() => new Promise((resolve) => resolve(null)));

    const columns: ReturnType<typeof useColumns>['columns'] = result.current.columns;

    expect(columns).toHaveLength(9);
    expect(columns[0].isExpander).toBeTruthy();
    expect(columns[1].name).toBe('ID');
    expect(columns[2].id).toBe('alertRule');
    expect(columns[3].name).toBe('Type');
    expect(columns[4].name).toBe('Status');
    expect(columns[5].name).toBe('Mode');
    expect(columns[6].name).toBe('Progress');
    expect(columns[7].name).toBe('Health');
    expect(columns[8].name).toBe('Actions');
  });

  test('renders description below transform ID', async () => {
    const queryClient = new QueryClient();
    const wrapper: FC<PropsWithChildren<unknown>> = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useColumns([], () => {}, 1, [], false), {
      wrapper,
    });

    await waitFor(() => new Promise((resolve) => resolve(null)));

    const idColumn = result.current.columns[1];
    const item = {
      ...transformListRow,
      config: {
        ...transformListRow.config,
        description: 'Tracks inventory and stock levels.',
      },
    } as unknown as TransformListRow;

    renderWithI18n(<>{idColumn.render?.(item.id, item)}</>);

    expect(screen.getByText(item.id)).toBeInTheDocument();
    expect(screen.getByText('Tracks inventory and stock levels.')).toBeInTheDocument();
  });
});
