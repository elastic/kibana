/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, waitFor, renderHook } from '@testing-library/react';
import { useAssigneesAction } from './use_assignees_action';

import * as api from '../../../containers/api';
import { basicCase } from '../../../containers/mock';
import { TestProviders } from '../../../common/mock';
import { coreMock } from '@kbn/core/public/mocks';
import React from 'react';

jest.mock('../../../containers/api');

describe('useAssigneesAction', () => {
  const onAction = jest.fn();
  const onActionSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders an action', async () => {
    const { result } = renderHook(
      () =>
        useAssigneesAction({
          onAction,
          onActionSuccess,
          isDisabled: false,
        }),
      {
        wrapper: TestProviders,
      }
    );

    expect(result.current.getAction([basicCase])).toMatchInlineSnapshot(`
      Object {
        "data-test-subj": "cases-bulk-action-assignees",
        "disabled": false,
        "icon": <EuiIcon
          size="m"
          type="userAvatar"
        />,
        "key": "cases-bulk-action-assignees",
        "name": "Edit assignees",
        "onClick": [Function],
      }
    `);
  });

  it('update the assignees correctly', async () => {
    const updateSpy = jest.spyOn(api, 'updateCases');

    const { result } = renderHook(
      () => useAssigneesAction({ onAction, onActionSuccess, isDisabled: false }),
      {
        wrapper: TestProviders,
      }
    );

    const action = result.current.getAction([basicCase]);

    act(() => {
      action.onClick();
    });

    expect(onAction).toHaveBeenCalled();
    expect(result.current.isFlyoutOpen).toBe(true);

    act(() => {
      result.current.onSaveAssignees({ selectedItems: ['1'], unSelectedItems: [] });
    });

    await waitFor(() => {
      expect(result.current.isFlyoutOpen).toBe(false);
    });

    expect(onActionSuccess).toHaveBeenCalled();
    expect(updateSpy).toHaveBeenCalledWith({
      cases: [
        {
          assignees: [{ uid: 'u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0' }, { uid: '1' }],
          id: basicCase.id,
          version: basicCase.version,
        },
      ],
    });
  });

  it('shows the success toaster correctly when updating one case', async () => {
    const coreStart = coreMock.createStart();

    const { result } = renderHook(
      () => useAssigneesAction({ onAction, onActionSuccess, isDisabled: false }),
      {
        wrapper: (props) => <TestProviders {...props} coreStart={coreStart} />,
      }
    );

    const action = result.current.getAction([basicCase]);

    act(() => {
      action.onClick();
    });

    act(() => {
      result.current.onSaveAssignees({ selectedItems: ['1', '1'], unSelectedItems: ['2'] });
    });

    await waitFor(() => {
      expect(coreStart.notifications.toasts.addSuccess).toHaveBeenCalledWith({
        title: 'Edited case',
        className: 'eui-textBreakWord',
      });
    });
  });

  it('shows the success toaster correctly when updating multiple cases', async () => {
    const coreStart = coreMock.createStart();

    const { result } = renderHook(
      () => useAssigneesAction({ onAction, onActionSuccess, isDisabled: false }),
      {
        wrapper: (props) => <TestProviders {...props} coreStart={coreStart} />,
      }
    );

    const action = result.current.getAction([basicCase, basicCase]);

    act(() => {
      action.onClick();
    });

    act(() => {
      result.current.onSaveAssignees({ selectedItems: ['1', '1'], unSelectedItems: ['2'] });
    });

    await waitFor(() => {
      expect(coreStart.notifications.toasts.addSuccess).toHaveBeenCalledWith({
        title: 'Edited 2 cases',
        className: 'eui-textBreakWord',
      });
    });
  });
});
