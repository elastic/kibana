/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, type PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { waitFor, renderHook } from '@testing-library/react';

import { getInitialTransformCapabilities } from '../../../../../../common/types/capabilities';
import { useAppDependencies } from '../../../../app_dependencies';
import type { TransformListRow } from '../../../../common';
import transformListRow from '../../../../common/__mocks__/transform_list_row.json';

jest.mock('../../../../app_dependencies');

import { useActions } from './use_actions';

const item = transformListRow as unknown as TransformListRow;

interface RowAction {
  'data-test-subj'?: string;
  enabled?: (row: TransformListRow) => boolean;
}

const renderActions = (): RowAction[] => {
  const queryClient = new QueryClient();
  const wrapper: FC<PropsWithChildren<unknown>> = ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useActions({ forceDisable: false, transformNodes: 1 }), {
    wrapper,
  });
  return result.current.actions as RowAction[];
};

const getEnabledState = (actions: RowAction[]) =>
  Object.fromEntries(
    actions.flatMap(({ 'data-test-subj': testSubj, enabled }) =>
      enabled ? [[testSubj, enabled(item)]] : []
    )
  );

describe('Transform: Transform List Actions', () => {
  afterEach(() => {
    Object.assign(useAppDependencies().application.capabilities, { transform: undefined });
  });

  test('useActions()', async () => {
    const queryClient = new QueryClient();
    const wrapper: FC<PropsWithChildren<unknown>> = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useActions({ forceDisable: false, transformNodes: 1 }), {
      wrapper,
    });

    await waitFor(() => new Promise((resolve) => resolve(null)));

    const actions = result.current.actions;

    // Using `any` for the callback. Somehow the EUI types don't pass
    // on the `data-test-subj` attribute correctly. We're interested
    // in the runtime result here anyway.
    expect(actions.map((a: any) => a['data-test-subj'])).toStrictEqual([
      'transformActionDiscover',
      'transformActionCreateAlertRule',
      'transformActionScheduleNow',
      'transformActionStart',
      'transformActionStop',
      'transformActionEdit',
      'transformActionClone',
      'transformActionDelete',
      'transformActionReauthorize',
      'transformActionReset',
    ]);
  });

  test('useActions() disables every row action without transform capabilities', () => {
    const enabledState = getEnabledState(renderActions());

    expect(Object.keys(enabledState).length).toBeGreaterThan(0);
    expect(Object.values(enabledState).every((enabled) => enabled === false)).toBe(true);
  });

  test('useActions() enables management actions with full transform capabilities', () => {
    Object.assign(useAppDependencies().application.capabilities, {
      transform: getInitialTransformCapabilities(true),
    });

    const enabledState = getEnabledState(renderActions());

    expect(enabledState).toEqual(
      expect.objectContaining({
        transformActionEdit: true,
        transformActionDelete: true,
        transformActionCreateAlertRule: true,
      })
    );
  });
});
