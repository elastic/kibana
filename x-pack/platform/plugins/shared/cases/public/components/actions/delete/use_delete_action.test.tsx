/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, waitFor, renderHook } from '@testing-library/react';
import { useDeleteAction } from './use_delete_action';

import * as api from '../../../containers/api';
import { basicCase } from '../../../containers/mock';
import { TestProviders } from '../../../common/mock';
import { coreMock } from '@kbn/core/public/mocks';
import React from 'react';

jest.mock('../../../containers/api');

// FLAKY: https://github.com/elastic/kibana/issues/208663
describe.skip('useDeleteAction', () => {
  const onAction = jest.fn();
  const onActionSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders an action with one case', async () => {
    const { result } = renderHook(
      () => useDeleteAction({ onAction, onActionSuccess, isDisabled: false }),
      {
        wrapper: TestProviders,
      }
    );

    expect(result.current.getAction([basicCase])).toMatchInlineSnapshot(`
      Object {
        "data-test-subj": "cases-bulk-action-delete",
        "disabled": false,
        "icon": <EuiIcon
          color="danger"
          size="m"
          type="trash"
        />,
        "key": "cases-bulk-action-delete",
        "name": <EuiTextColor
          color="danger"
        >
          Delete case
        </EuiTextColor>,
        "onClick": [Function],
      }
    `);
  });

  it('renders an action with multiple cases', async () => {
    const { result } = renderHook(
      () => useDeleteAction({ onAction, onActionSuccess, isDisabled: false }),
      {
        wrapper: TestProviders,
      }
    );

    expect(result.current.getAction([basicCase, basicCase])).toMatchInlineSnapshot(`
      Object {
        "data-test-subj": "cases-bulk-action-delete",
        "disabled": false,
        "icon": <EuiIcon
          color="danger"
          size="m"
          type="trash"
        />,
        "key": "cases-bulk-action-delete",
        "name": <EuiTextColor
          color="danger"
        >
          Delete cases
        </EuiTextColor>,
        "onClick": [Function],
      }
    `);
  });

  it('deletes the selected cases', async () => {
    const deleteSpy = jest.spyOn(api, 'deleteCases');

    const { result } = renderHook(
      () => useDeleteAction({ onAction, onActionSuccess, isDisabled: false }),
      {
        wrapper: TestProviders,
      }
    );

    const action = result.current.getAction([basicCase]);

    act(() => {
      action.onClick();
    });

    expect(onAction).toHaveBeenCalled();
    expect(result.current.isModalVisible).toBe(true);

    act(() => {
      result.current.onConfirmDeletion();
    });

    await waitFor(() => {
      expect(result.current.isModalVisible).toBe(false);
    });

    expect(onActionSuccess).toHaveBeenCalled();
    expect(deleteSpy).toHaveBeenCalledWith({ caseIds: ['basic-case-id'] });
  });

  it('closes the modal', async () => {
    const { result } = renderHook(
      () => useDeleteAction({ onAction, onActionSuccess, isDisabled: false }),
      {
        wrapper: TestProviders,
      }
    );

    const action = result.current.getAction([basicCase]);

    act(() => {
      action.onClick();
    });

    expect(result.current.isModalVisible).toBe(true);

    act(() => {
      result.current.onCloseModal();
    });

    await waitFor(() => {
      expect(result.current.isModalVisible).toBe(false);
    });
  });

  it('shows the success toaster correctly when delete one case', async () => {
    const coreStart = coreMock.createStart();

    const { result } = renderHook(
      () => useDeleteAction({ onAction, onActionSuccess, isDisabled: false }),
      {
        wrapper: (props) => <TestProviders {...props} coreStart={coreStart} />,
      }
    );

    const action = result.current.getAction([basicCase]);

    act(() => {
      action.onClick();
    });

    act(() => {
      result.current.onConfirmDeletion();
    });

    await waitFor(() => {
      expect(coreStart.notifications.toasts.addSuccess).toHaveBeenCalledWith({
        title: 'Deleted case',
        className: 'eui-textBreakWord',
      });
    });
  });

  it('shows the success toaster correctly when delete multiple case', async () => {
    const coreStart = coreMock.createStart();

    const { result } = renderHook(
      () => useDeleteAction({ onAction, onActionSuccess, isDisabled: false }),
      {
        wrapper: (props) => <TestProviders {...props} coreStart={coreStart} />,
      }
    );

    const action = result.current.getAction([basicCase, basicCase]);

    act(() => {
      action.onClick();
    });

    act(() => {
      result.current.onConfirmDeletion();
    });

    await waitFor(() => {
      expect(coreStart.notifications.toasts.addSuccess).toHaveBeenCalledWith({
        title: 'Deleted 2 cases',
        className: 'eui-textBreakWord',
      });
    });
  });
});
