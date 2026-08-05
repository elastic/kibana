/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, type PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { act, screen, waitFor, renderHook } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import type { EuiTableComputedColumnType, EuiTableFieldDataColumnType } from '@elastic/eui';
import { PROJECT_ROUTING, type ICPSManager } from '@kbn/cps-utils';
import type { TransformListRow } from '../../../../common';
import * as appDependencies from '../../../../app_dependencies';

import { useColumns } from './use_columns';

import transformListRow from '../../../../common/__mocks__/transform_list_row.json';

jest.mock('../../../../app_dependencies');

describe('Transform: Job List Columns', () => {
  const defaultAppDependencies = appDependencies.useAppDependencies();
  const createWrapper = () => {
    const queryClient = new QueryClient();
    const wrapper: FC<PropsWithChildren<unknown>> = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return wrapper;
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('useColumns()', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useColumns([], () => {}, 1, [], false), {
      wrapper,
    });

    await waitFor(() => new Promise((resolve) => resolve(null)));

    const columns: ReturnType<typeof useColumns>['columns'] = result.current.columns;

    expect(columns).toHaveLength(9);
    const expanderColumn = columns[0] as EuiTableComputedColumnType<TransformListRow>;
    const alertRuleColumn = columns[2] as EuiTableComputedColumnType<TransformListRow>;

    expect(expanderColumn.isExpander).toBeTruthy();
    expect(columns[1].name).toBe('ID');
    expect(alertRuleColumn.id).toBe('alertRule');
    expect(columns[3].name).toBe('Type');
    expect(columns[4].name).toBe('Status');
    expect(columns[5].name).toBe('Mode');
    expect(columns[6].name).toBe('Progress');
    expect(columns[7].name).toBe('Health');
    expect(columns[8].name).toBe('Actions');
  });

  test('renders description below transform ID', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useColumns([], () => {}, 1, [], false), {
      wrapper,
    });

    await waitFor(() => new Promise((resolve) => resolve(null)));

    const idColumn = result.current.columns[1] as EuiTableFieldDataColumnType<TransformListRow>;
    const item = {
      ...transformListRow,
      config: {
        ...transformListRow.config,
        description: 'Tracks inventory and stock levels.',
      },
    } as unknown as TransformListRow;

    renderWithI18n(<>{idColumn.render?.(item.id, item)}</>);

    expect(screen.getByTestId('transformListColumnIdText')).toHaveTextContent(item.id);
    expect(screen.getByTestId('transformListColumnDescriptionText')).toHaveTextContent(
      'Tracks inventory and stock levels.'
    );
  });

  test('adds project scope column when CPS manager is ready with linked projects', async () => {
    let isReady = false;
    const cpsManager = {
      whenReady: jest.fn().mockImplementation(async () => {
        isReady = true;
      }),
      hasLinkedProjects: jest.fn(() => isReady),
      getTotalProjectCount: jest.fn(() => 2),
    } as unknown as ICPSManager;

    jest.spyOn(appDependencies, 'useAppDependencies').mockReturnValue({
      ...defaultAppDependencies,
      cps: { cpsManager },
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useColumns([], () => {}, 1, [], false), {
      wrapper,
    });

    expect(result.current.columns).toHaveLength(9);

    await waitFor(() => {
      expect(result.current.columns).toHaveLength(10);
    });
    expect(result.current.columns[3].name).toBe('Project scope');
  });

  test('does not add project scope column when there are no linked projects', async () => {
    const cpsManager = {
      whenReady: jest.fn().mockResolvedValue(undefined),
      hasLinkedProjects: jest.fn(() => false),
      getTotalProjectCount: jest.fn(() => 1),
    } as unknown as ICPSManager;

    jest.spyOn(appDependencies, 'useAppDependencies').mockReturnValue({
      ...defaultAppDependencies,
      cps: { cpsManager },
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useColumns([], () => {}, 1, [], false), {
      wrapper,
    });

    await act(async () => {
      await cpsManager.whenReady();
    });

    expect(result.current.columns).toHaveLength(9);
  });

  test('normalizes project scope sort values', async () => {
    const cpsManager = {
      whenReady: jest.fn().mockResolvedValue(undefined),
      hasLinkedProjects: jest.fn(() => true),
      getTotalProjectCount: jest.fn(() => 2),
    } as unknown as ICPSManager;

    jest.spyOn(appDependencies, 'useAppDependencies').mockReturnValue({
      ...defaultAppDependencies,
      cps: { cpsManager },
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useColumns([], () => {}, 1, [], false), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.columns).toHaveLength(10);
    });

    const projectScopeColumn = result.current
      .columns[3] as EuiTableComputedColumnType<TransformListRow>;
    const getSortValue = projectScopeColumn.sortable as (item: TransformListRow) => string;
    const item = transformListRow as unknown as TransformListRow;

    expect(getSortValue(item)).toBe(
      getSortValue({
        ...item,
        config: {
          ...item.config,
          source: { ...item.config.source, project_routing: PROJECT_ROUTING.ORIGIN },
        },
      })
    );
    expect(
      getSortValue({
        ...item,
        config: {
          ...item.config,
          source: { ...item.config.source, project_routing: PROJECT_ROUTING.ALL },
        },
      })
    ).toBe('all');
  });
});
