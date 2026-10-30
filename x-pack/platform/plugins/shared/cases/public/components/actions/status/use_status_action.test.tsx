/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, waitFor, renderHook, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { EuiContextMenuPanelItemDescriptor } from '@elastic/eui';
import { EuiContextMenu } from '@elastic/eui';
import { useStatusAction } from './use_status_action';
import { basicCase } from '../../../containers/mock';
import type { UpdateSummary } from '../../../../common/types/api';
import { CaseStatuses } from '../../../../common/types/domain';
import { useUserPermissions } from '../../user_actions/use_user_permissions';
import { useShouldDisableStatus } from './use_should_disable_status';
import { TestProviders } from '../../../common/mock';
import { useUpdateCases } from '../../../containers/use_bulk_update_case';
import type { CaseStatusDefinition } from '../../../../common/types/domain';
import { DEFAULT_CASE_STATUSES } from '../../../../common/utils/statuses';
import * as customStatuses from '../../../common/custom_statuses';
import * as api from '../../../containers/api';

jest.mock('../../user_actions/use_user_permissions');
jest.mock('./use_should_disable_status');
jest.mock('../../../containers/use_bulk_update_case');

describe('useStatusAction', () => {
  const onAction = jest.fn();
  const onActionSuccess = jest.fn();
  const mutate = jest.fn();

  const getUpdateSuccessToastFromLastCall = (updateSummary?: UpdateSummary[]) => {
    const updateCall = mutate.mock.calls.at(-1)?.[0] as
      | {
          getUpdateSuccessToast?: (args: { updateSummary?: UpdateSummary[] }) => {
            title: string;
            text?: unknown;
          };
        }
      | undefined;

    return updateCall?.getUpdateSuccessToast?.({ updateSummary });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useUpdateCases as jest.Mock).mockReturnValue({
      mutate,
      isLoading: false,
    });
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
          "onClick": [Function],
        },
      ]
    `);
  });

  it('update the status cases', async () => {
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

      expect(mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          cases: [{ status, id: basicCase.id, version: basicCase.version }],
        }),
        expect.objectContaining({ onSuccess: onActionSuccess })
      );
    }

    act(() => {
      result.current.handleUpdateCaseStatus([basicCase], CaseStatuses.closed);
    });

    await waitFor(() => {
      expect(mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          cases: [{ status: CaseStatuses.closed, id: basicCase.id, version: basicCase.version }],
        }),
        expect.objectContaining({ onSuccess: onActionSuccess })
      );
    });
  });

  it('shows closed alert count details when closing with a reason', async () => {
    const { result } = renderHook(
      () => useStatusAction({ onAction, onActionSuccess, isDisabled: false }),
      {
        wrapper: TestProviders,
      }
    );

    act(() => {
      result.current.handleUpdateCaseStatus(
        [
          {
            ...basicCase,
            totalAlerts: 4,
          },
        ],
        CaseStatuses.closed,
        'false_positive'
      );
    });

    await waitFor(() => {
      expect(mutate).toHaveBeenCalled();
    });
    const toast = getUpdateSuccessToastFromLastCall([{ syncedAlertCount: 3 }]);
    expect(toast).toEqual(
      expect.objectContaining({
        title: 'Closed "Another horrible breach!!"',
        text: 'Closed 3/4 attached alerts.',
      })
    );
  });

  it('shows only summary text for bulk close with reason', async () => {
    const { result } = renderHook(
      () => useStatusAction({ onAction, onActionSuccess, isDisabled: false }),
      {
        wrapper: TestProviders,
      }
    );

    act(() => {
      result.current.handleUpdateCaseStatus(
        [
          { ...basicCase, totalAlerts: 2 },
          { ...basicCase, id: 'another-id', totalAlerts: 2 },
        ],
        CaseStatuses.closed,
        'false_positive'
      );
    });

    await waitFor(() => {
      expect(mutate).toHaveBeenCalled();
    });

    expect(
      getUpdateSuccessToastFromLastCall([{ syncedAlertCount: 1 }, { syncedAlertCount: 1 }])
    ).toEqual({
      title: 'Closed 2 cases',
      text: 'Closed 2/4 attached alerts.',
    });
  });

  const singleCaseTests = [
    [CaseStatuses.open, 0, 'Opened "Another horrible breach!!"'],
    [CaseStatuses['in-progress'], 1, 'Marked "Another horrible breach!!" as in progress'],
  ];

  it.each(singleCaseTests)(
    'shows the success toaster correctly when updating the status of the case: %s',
    async (_, index, expectedMessage) => {
      const { result } = renderHook(
        () => useStatusAction({ onAction, onActionSuccess, isDisabled: false }),
        {
          wrapper: TestProviders,
        }
      );

      const actions = result.current.getActions([basicCase]);

      act(() => {
        // @ts-expect-error: onClick expects a MouseEvent argument
        actions[index]!.onClick();
      });

      await waitFor(() => {
        expect(mutate).toHaveBeenCalled();
      });
      expect(getUpdateSuccessToastFromLastCall()).toEqual({
        title: expectedMessage,
      });
    }
  );

  it('shows the success toaster correctly when updating a single case to closed', async () => {
    const { result } = renderHook(
      () => useStatusAction({ onAction, onActionSuccess, isDisabled: false }),
      {
        wrapper: TestProviders,
      }
    );

    act(() => {
      result.current.handleUpdateCaseStatus([basicCase], CaseStatuses.closed);
    });

    await waitFor(() => {
      expect(mutate).toHaveBeenCalled();
    });
    expect(getUpdateSuccessToastFromLastCall()).toEqual({
      title: 'Closed "Another horrible breach!!"',
    });
  });

  const multipleCasesTests: Array<[CaseStatuses, number, string]> = [
    [CaseStatuses.open, 0, 'Opened 2 cases'],
    [CaseStatuses['in-progress'], 1, 'Marked 2 cases as in progress'],
  ];

  it.each(multipleCasesTests)(
    'shows the success toaster correctly when updating the status of the case: %s',
    async (_, index, expectedMessage) => {
      const { result } = renderHook(
        () => useStatusAction({ onAction, onActionSuccess, isDisabled: false }),
        {
          wrapper: TestProviders,
        }
      );

      const actions = result.current.getActions([basicCase, basicCase]);

      act(() => {
        // @ts-expect-error: onClick expects a MouseEvent argument
        actions[index]!.onClick();
      });

      await waitFor(() => {
        expect(mutate).toHaveBeenCalled();
      });
      expect(getUpdateSuccessToastFromLastCall()).toEqual({
        title: expectedMessage,
      });
    }
  );

  it('shows the success toaster correctly when updating multiple cases to closed', async () => {
    const { result } = renderHook(
      () => useStatusAction({ onAction, onActionSuccess, isDisabled: false }),
      {
        wrapper: TestProviders,
      }
    );

    act(() => {
      result.current.handleUpdateCaseStatus([basicCase, basicCase], CaseStatuses.closed);
    });

    await waitFor(() => {
      expect(mutate).toHaveBeenCalled();
    });
    expect(getUpdateSuccessToastFromLastCall()).toEqual({
      title: 'Closed 2 cases',
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

  describe('with custom statuses', () => {
    const triage: CaseStatusDefinition = {
      key: 'triage',
      label: 'Triage',
      color: 'accent',
      category: 'not_started',
      order: 1,
      isDefault: false,
      disabled: false,
    };
    const retired: CaseStatusDefinition = {
      ...triage,
      key: 'retired',
      label: 'Retired',
      category: 'active',
      order: 3,
      disabled: true,
    };
    const resolved: CaseStatusDefinition = {
      ...triage,
      key: 'resolved',
      label: 'Resolved',
      category: 'done',
      order: 5,
    };
    const statuses: CaseStatusDefinition[] = [
      { ...DEFAULT_CASE_STATUSES[0], order: 0 },
      triage,
      { ...DEFAULT_CASE_STATUSES[1], order: 2 },
      retired,
      { ...DEFAULT_CASE_STATUSES[2], order: 4 },
      resolved,
    ];

    beforeEach(() => {
      jest.spyOn(customStatuses, 'isCustomStatusesEnabled').mockReturnValue(true);
      jest.spyOn(api, 'getCaseStatuses').mockResolvedValue(statuses);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    const renderMenu = (items: EuiContextMenuPanelItemDescriptor[]) =>
      render(<EuiContextMenu initialPanelId={0} panels={[{ id: 0, items }]} />);

    const renderStatusAction = (
      props: Partial<Parameters<typeof useStatusAction>[0]> = {}
    ): ReturnType<typeof renderHook<ReturnType<typeof useStatusAction>, unknown>> =>
      renderHook(
        () => useStatusAction({ onAction, onActionSuccess, isDisabled: false, ...props }),
        { wrapper: TestProviders }
      );

    it('lists the enabled statuses in admin order', async () => {
      const { result } = renderStatusAction();

      await waitFor(() => expect(result.current.getActions([basicCase])).toHaveLength(5));
      expect(result.current.getActions([basicCase]).map(({ name }) => name)).toEqual([
        'Open',
        'Triage',
        'In progress',
        'Closed',
        'Resolved',
      ]);
    });

    it('shows a disabled current status, which cannot be picked', async () => {
      const { result } = renderStatusAction({
        selectedStatus: CaseStatuses['in-progress'],
        selectedStatusKey: 'retired',
      });

      await waitFor(() => expect(result.current.getActions([basicCase])).toHaveLength(6));
      const retiredAction = result.current
        .getActions([basicCase])
        .find(({ key }) => key === 'cases-bulk-action-status-retired');

      expect(retiredAction).toEqual(expect.objectContaining({ disabled: true, icon: 'check' }));
    });

    it('checks the status the case is in', async () => {
      const { result } = renderStatusAction({
        selectedStatus: CaseStatuses.open,
        selectedStatusKey: 'triage',
      });

      await waitFor(() => expect(result.current.getActions([basicCase])).toHaveLength(5));
      expect(result.current.getActions([basicCase]).map(({ icon }) => icon)).toEqual([
        'empty',
        'check',
        'empty',
        'empty',
        'empty',
      ]);
    });

    it('sends the status key with its status', async () => {
      const { result } = renderStatusAction();

      await waitFor(() => expect(result.current.getActions([basicCase])).toHaveLength(5));
      renderMenu(result.current.getActions([basicCase]));
      await userEvent.click(screen.getByTestId('cases-bulk-action-status-triage'));

      expect(mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          cases: [
            {
              status: CaseStatuses.open,
              status_key: 'triage',
              id: basicCase.id,
              version: basicCase.version,
              closeReason: undefined,
            },
          ],
        }),
        expect.objectContaining({ onSuccess: onActionSuccess })
      );
      expect(getUpdateSuccessToastFromLastCall()).toEqual({
        title: 'Marked "Another horrible breach!!" as Triage',
      });
    });

    it('hands done statuses to onSelectClosed', async () => {
      const onSelectClosed = jest.fn();
      const { result } = renderStatusAction();

      await waitFor(() => expect(result.current.getActions([basicCase])).toHaveLength(5));
      renderMenu(result.current.getActions([basicCase], onSelectClosed));
      await userEvent.click(screen.getByTestId('cases-bulk-action-status-resolved'));

      expect(onSelectClosed).toHaveBeenCalledWith(resolved);
      expect(mutate).not.toHaveBeenCalled();
    });

    it('sends only the status when given a category', async () => {
      const { result } = renderStatusAction();

      act(() => {
        result.current.handleUpdateCaseStatus([basicCase], CaseStatuses.closed, 'duplicate');
      });

      expect(mutate.mock.calls.at(-1)?.[0].cases).toEqual([
        {
          status: CaseStatuses.closed,
          id: basicCase.id,
          version: basicCase.version,
          closeReason: 'duplicate',
        },
      ]);
    });
  });
});
