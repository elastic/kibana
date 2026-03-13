/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, waitFor, renderHook } from '@testing-library/react';
import { useStatusAction } from './use_status_action';

import * as api from '../../../containers/api';
import { basicCase } from '../../../containers/mock';
import { CaseStatuses } from '../../../../common/types/domain';
import { useUserPermissions } from '../../user_actions/use_user_permissions';
import { useShouldDisableStatus } from './use_should_disable_status';
import { TestProviders } from '../../../common/mock';
import { coreMock } from '@kbn/core/public/mocks';
import React from 'react';

jest.mock('../../user_actions/use_user_permissions');
jest.mock('./use_should_disable_status');
jest.mock('../../../containers/api');

describe('useStatusAction', () => {
  const onAction = jest.fn();
  const onActionSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useShouldDisableStatus as jest.Mock).mockReturnValue(() => false);

    (useUserPermissions as jest.Mock).mockReturnValue({
      canUpdate: true,
      canReopenCase: true,
    });
  });

  it('renders an action', async () => {
    const { result } = renderHook(
      () =>
        useStatusAction({
          onAction,
          onActionSuccess,
          isDisabled: false,
        }),
      {
        wrapper: TestProviders,
      }
    );

    expect(result.current.getActions([basicCase])).toMatchInlineSnapshot(`
      Array [
        Object {
          "data-test-subj": "cases-bulk-action-status-open",
          "disabled": false,
          "icon": "empty",
          "key": "cases-bulk-action-status-open",
          "name": "Open",
          "onClick": [Function],
        },
        Object {
          "data-test-subj": "cases-bulk-action-status-in-progress",
          "disabled": false,
          "icon": "empty",
          "key": "cases-bulk-action-status-in-progress",
          "name": "In progress",
          "onClick": [Function],
        },
        Object {
          "data-test-subj": "cases-bulk-action-status-closed",
          "disabled": false,
          "icon": "empty",
          "key": "cases-bulk-action-status-closed",
          "name": "Closed",
        },
      ]
    `);
  });

  it('update the status cases', async () => {
    const updateSpy = jest.spyOn(api, 'updateCases');

    const { result } = renderHook(
      () => useStatusAction({ onAction, onActionSuccess, isDisabled: false }),
      {
        wrapper: TestProviders,
      }
    );

    const actions = result.current.getActions([basicCase]);

    for (const [index, status] of [CaseStatuses.open, CaseStatuses['in-progress']].entries()) {
      act(() => {
        // @ts-expect-error: onClick expects a MouseEvent argument
        actions[index]!.onClick();
      });

      await waitFor(() => {
        expect(onAction).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(onActionSuccess).toHaveBeenCalled();
      });
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          cases: [{ status, id: basicCase.id, version: basicCase.version }],
        })
      );
    }

    act(() => {
      result.current.handleUpdateCaseStatus([basicCase], CaseStatuses.closed);
    });

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          cases: [{ status: CaseStatuses.closed, id: basicCase.id, version: basicCase.version }],
        })
      );
    });
  });

  it('shows closed alert count details when closing with a reason', async () => {
    const coreStart = coreMock.createStart();
    jest.spyOn(api, 'updateCases').mockResolvedValue({
      cases: [
        {
          ...basicCase,
          patchCaseStats: {
            numberOfAlertsSyncedWithCloseReason: 3,
          },
        },
      ],
    });

    const { result } = renderHook(
      () => useStatusAction({ onAction, onActionSuccess, isDisabled: false }),
      {
        wrapper: (props) => <TestProviders {...props} coreStart={coreStart} />,
      }
    );

    act(() => {
      result.current.handleUpdateCaseStatus(
        [{ ...basicCase, totalAlerts: 4 }],
        CaseStatuses.closed,
        'false_positive'
      );
    });

    await waitFor(() =>
      expect(coreStart.notifications.toasts.addSuccess).toHaveBeenCalledWith({
        title: 'Closed "Another horrible breach!!"',
        text: 'Closed 3/4 attached alerts.',
        className: 'eui-textBreakWord',
      })
    );
  });

  const singleCaseTests = [
    [CaseStatuses.open, 0, 'Opened "Another horrible breach!!"'],
    [CaseStatuses['in-progress'], 1, 'Marked "Another horrible breach!!" as in progress'],
  ];

  it.each(singleCaseTests)(
    'shows the success toaster correctly when updating the status of the case: %s',
    async (_, index, expectedMessage) => {
      const coreStart = coreMock.createStart();

      const { result } = renderHook(
        () => useStatusAction({ onAction, onActionSuccess, isDisabled: false }),
        {
          wrapper: (props) => <TestProviders {...props} coreStart={coreStart} />,
        }
      );

      const actions = result.current.getActions([basicCase]);

      act(() => {
        // @ts-expect-error: onClick expects a MouseEvent argument
        actions[index]!.onClick();
      });

      await waitFor(() => {
        expect(coreStart.notifications.toasts.addSuccess).toHaveBeenCalledWith({
          title: expectedMessage,
          text: undefined,
          className: 'eui-textBreakWord',
        });
      });
    }
  );

  it('shows the success toaster correctly when updating a single case to closed', async () => {
    const coreStart = coreMock.createStart();

    const { result } = renderHook(
      () => useStatusAction({ onAction, onActionSuccess, isDisabled: false }),
      {
        wrapper: (props) => <TestProviders {...props} coreStart={coreStart} />,
      }
    );

    act(() => {
      result.current.handleUpdateCaseStatus([basicCase], CaseStatuses.closed);
    });

    await waitFor(() => {
      expect(coreStart.notifications.toasts.addSuccess).toHaveBeenCalledWith({
        title: 'Closed "Another horrible breach!!"',
        text: undefined,
        className: 'eui-textBreakWord',
      });
    });
  });

  const multipleCasesTests: Array<[CaseStatuses, number, string]> = [
    [CaseStatuses.open, 0, 'Opened 2 cases'],
    [CaseStatuses['in-progress'], 1, 'Marked 2 cases as in progress'],
  ];

  it.each(multipleCasesTests)(
    'shows the success toaster correctly when updating the status of the case: %s',
    async (_, index, expectedMessage) => {
      const coreStart = coreMock.createStart();

      const { result } = renderHook(
        () => useStatusAction({ onAction, onActionSuccess, isDisabled: false }),
        {
          wrapper: (props) => <TestProviders {...props} coreStart={coreStart} />,
        }
      );

      const actions = result.current.getActions([basicCase, basicCase]);

      act(() => {
        // @ts-expect-error: onClick expects a MouseEvent argument
        actions[index]!.onClick();
      });

      await waitFor(() => {
        expect(coreStart.notifications.toasts.addSuccess).toHaveBeenCalledWith({
          title: expectedMessage,
          text: undefined,
          className: 'eui-textBreakWord',
        });
      });
    }
  );

  it('shows the success toaster correctly when updating multiple cases to closed', async () => {
    const coreStart = coreMock.createStart();

    const { result } = renderHook(
      () => useStatusAction({ onAction, onActionSuccess, isDisabled: false }),
      {
        wrapper: (props) => <TestProviders {...props} coreStart={coreStart} />,
      }
    );

    act(() => {
      result.current.handleUpdateCaseStatus([basicCase, basicCase], CaseStatuses.closed);
    });

    await waitFor(() => {
      expect(coreStart.notifications.toasts.addSuccess).toHaveBeenCalledWith({
        title: 'Closed 2 cases',
        text: undefined,
        className: 'eui-textBreakWord',
      });
    });
  });

  const disabledTests: Array<[CaseStatuses, number]> = [
    [CaseStatuses.open, 0],
    [CaseStatuses['in-progress'], 1],
    [CaseStatuses.closed, 2],
  ];

  it.each(disabledTests)('disables the status button correctly: %s', async (status, index) => {
    (useShouldDisableStatus as jest.Mock).mockReturnValue(() => true);

    const { result } = renderHook(
      () => useStatusAction({ onAction, onActionSuccess, isDisabled: false }),
      {
        wrapper: TestProviders,
      }
    );

    const actions = result.current.getActions([{ ...basicCase, status }]);
    expect(actions[index].disabled).toBe(true);
  });

  it.each(disabledTests)(
    'disables the status button correctly if isDisabled=true: %s',
    async (status, index) => {
      const { result } = renderHook(
        () => useStatusAction({ onAction, onActionSuccess, isDisabled: true }),
        {
          wrapper: TestProviders,
        }
      );

      const actions = result.current.getActions([basicCase]);
      expect(actions[index].disabled).toBe(true);
    }
  );

  it('respects user permissions when everything is false', () => {
    (useUserPermissions as jest.Mock).mockReturnValue({
      canUpdate: false,
      canReopenCase: false,
    });

    const { result } = renderHook(
      () => useStatusAction({ onAction, onActionSuccess, isDisabled: false }),
      {
        wrapper: TestProviders,
      }
    );

    expect(result.current.canUpdateStatus).toBe(false);
  });

  it('respects user permissions when only reopen is true', () => {
    (useUserPermissions as jest.Mock).mockReturnValue({
      canUpdate: false,
      canReopenCase: true,
    });

    const { result } = renderHook(
      () => useStatusAction({ onAction, onActionSuccess, isDisabled: false }),
      {
        wrapper: TestProviders,
      }
    );

    expect(result.current.canUpdateStatus).toBe(true);
  });
});
