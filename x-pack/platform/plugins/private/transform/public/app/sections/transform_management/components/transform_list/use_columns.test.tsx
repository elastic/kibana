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

    expect(columns).toHaveLength(7);
    const expanderColumn = columns[6] as EuiTableComputedColumnType<TransformListRow>;

    expect(columns[0].name).toBe('ID');
    expect(columns[1].name).toBe('Health');
    expect(columns[2].name).toBe('Type');
    expect(columns[3].name).toBe('Status');
    expect(columns[4].name).toBe('Execution');
    expect(expanderColumn.isExpander).toBeTruthy();
  });

  test('renders description below transform ID', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useColumns([], () => {}, 1, [], false), {
      wrapper,
    });

    await waitFor(() => new Promise((resolve) => resolve(null)));

    const idColumn = result.current.columns[0] as EuiTableFieldDataColumnType<TransformListRow>;
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

  test('renders type, status, and execution with the redesigned semantics', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useColumns([], () => {}, 1, [], false), {
      wrapper,
    });
    await waitFor(() => new Promise((resolve) => resolve(null)));

    const item = transformListRow as unknown as TransformListRow;
    const typeColumn = result.current.columns[2] as EuiTableComputedColumnType<TransformListRow>;
    const statusColumn = result.current.columns[3] as EuiTableComputedColumnType<TransformListRow>;
    const executionColumn = result.current
      .columns[4] as EuiTableComputedColumnType<TransformListRow>;

    const { rerender } = renderWithI18n(<>{typeColumn.render?.(item)}</>);
    expect(screen.getByText('Pivot')).toBeInTheDocument();

    rerender(<>{statusColumn.render?.(item)}</>);
    expect(screen.getByText('Stopped')).toBeInTheDocument();

    rerender(<>{executionColumn.render?.(item)}</>);
    expect(screen.getAllByText('100%')).not.toHaveLength(0);
    expect(screen.getByTestId('transformListProgress')).toBeInTheDocument();

    rerender(
      <>
        {executionColumn.render?.({
          ...item,
          mode: 'continuous',
        })}
      </>
    );
    expect(screen.getByText('Continuous')).toBeInTheDocument();
    expect(screen.queryByTestId('transformListProgress')).not.toBeInTheDocument();
  });

  test('adds project scope column when CPS manager is ready with linked projects', async () => {
    let isReady = false;
    const cpsManager = {
      whenReady: jest.fn().mockImplementation(async () => {
        isReady = true;
      }),
      hasLinkedProjects: jest.fn(() => isReady),
      fetchProjects: jest.fn().mockResolvedValue({
        origin: { _id: 'origin-project' },
        linkedProjects: [],
      }),
      getTotalProjectCount: jest.fn(() => 2),
    } as unknown as ICPSManager;

    jest.spyOn(appDependencies, 'useAppDependencies').mockReturnValue({
      ...defaultAppDependencies,
      cps: { cpsManager, isTierEligible: true },
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useColumns([], () => {}, 1, [], false), {
      wrapper,
    });

    expect(result.current.columns).toHaveLength(7);

    await waitFor(() => {
      expect(result.current.columns).toHaveLength(8);
    });
    expect(result.current.columns[1].name).toBe('Project scope');
  });

  test('does not add project scope column when there are no linked projects', async () => {
    const cpsManager = {
      whenReady: jest.fn().mockResolvedValue(undefined),
      hasLinkedProjects: jest.fn(() => false),
      getTotalProjectCount: jest.fn(() => 1),
    } as unknown as ICPSManager;

    jest.spyOn(appDependencies, 'useAppDependencies').mockReturnValue({
      ...defaultAppDependencies,
      cps: { cpsManager, isTierEligible: true },
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useColumns([], () => {}, 1, [], false), {
      wrapper,
    });

    await act(async () => {
      await cpsManager.whenReady();
    });

    expect(result.current.columns).toHaveLength(7);
  });

  test('normalizes project scope sort values', async () => {
    const cpsManager = {
      whenReady: jest.fn().mockResolvedValue(undefined),
      hasLinkedProjects: jest.fn(() => true),
      fetchProjects: jest.fn().mockResolvedValue({
        origin: { _id: 'origin-project' },
        linkedProjects: [],
      }),
      getTotalProjectCount: jest.fn(() => 2),
    } as unknown as ICPSManager;

    jest.spyOn(appDependencies, 'useAppDependencies').mockReturnValue({
      ...defaultAppDependencies,
      cps: { cpsManager, isTierEligible: true },
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useColumns([], () => {}, 1, [], false), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.columns).toHaveLength(8);
    });

    const projectScopeColumn = result.current
      .columns[1] as EuiTableComputedColumnType<TransformListRow>;
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
    await waitFor(() => {
      const updatedProjectScopeColumn = result.current
        .columns[1] as EuiTableComputedColumnType<TransformListRow>;
      const getUpdatedSortValue = updatedProjectScopeColumn.sortable as (
        item: TransformListRow
      ) => string;

      expect(
        getUpdatedSortValue({
          ...item,
          config: {
            ...item.config,
            source: { ...item.config.source, project_routing: '_id:origin-project' },
          },
        })
      ).toBe('origin');
    });
    expect(
      getSortValue({
        ...item,
        config: {
          ...item.config,
          source: { ...item.config.source, project_routing: '_id:linked-project' },
        },
      })
    ).toBe('custom:_id:linked-project');
  });
});
