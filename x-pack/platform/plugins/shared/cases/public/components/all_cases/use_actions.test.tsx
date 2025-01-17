/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import userEvent, { type UserEvent } from '@testing-library/user-event';
import { waitFor, renderHook } from '@testing-library/react';
import {
  waitForEuiPopoverOpen,
  waitForEuiContextMenuPanelTransition,
} from '@elastic/eui/lib/test/rtl';

import { useActions } from './use_actions';
import { basicCase } from '../../containers/mock';
import * as api from '../../containers/api';
import type { AppMockRenderer } from '../../common/mock';
import { CaseStatuses } from '../../../common/types/domain';
import {
  createAppMockRenderer,
  noDeleteCasesPermissions,
  onlyDeleteCasesPermission,
  allCasesPermissions,
  readCasesPermissions,
} from '../../common/mock';

jest.mock('../../containers/api');
jest.mock('../../containers/user_profiles/api');

describe('useActions', () => {
  let user: UserEvent;
  let appMockRender: AppMockRenderer;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
    user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    appMockRender = createAppMockRenderer();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await appMockRender.clearQueryCache();
  });

  it('renders column actions', async () => {
    const { result } = renderHook(() => useActions({ disableActions: false }), {
      wrapper: appMockRender.AppWrapper,
    });

    expect(result.current).toMatchInlineSnapshot(`
      Object {
        "actions": Object {
          "align": "right",
          "name": "Actions",
          "render": [Function],
          "width": "100px",
        },
      }
    `);
  });

  it('renders the popover', async () => {
    const { result } = renderHook(() => useActions({ disableActions: false }), {
      wrapper: appMockRender.AppWrapper,
    });

    const comp = result.current.actions!.render(basicCase) as React.ReactElement;
    const res = appMockRender.render(comp);

    expect(res.getByTestId(`case-action-popover-${basicCase.id}`)).toBeInTheDocument();
  });

  it('open the action popover', async () => {
    const { result } = renderHook(() => useActions({ disableActions: false }), {
      wrapper: appMockRender.AppWrapper,
    });

    const comp = result.current.actions!.render(basicCase) as React.ReactElement;
    const res = appMockRender.render(comp);

    await user.click(res.getByTestId(`case-action-popover-button-${basicCase.id}`));
    await waitForEuiPopoverOpen();

    expect(res.getByText('Actions')).toBeInTheDocument();
    expect(res.getByTestId(`case-action-status-panel-${basicCase.id}`)).toBeInTheDocument();
    expect(res.getByTestId('cases-bulk-action-delete')).toBeInTheDocument();
    expect(res.getByTestId('cases-action-copy-id')).toBeInTheDocument();
  });

  it('change the status of the case', async () => {
    const updateCasesSpy = jest.spyOn(api, 'updateCases');

    const { result } = renderHook(() => useActions({ disableActions: false }), {
      wrapper: appMockRender.AppWrapper,
    });

    const comp = result.current.actions!.render(basicCase) as React.ReactElement;
    const res = appMockRender.render(comp);

    await user.click(res.getByTestId(`case-action-popover-button-${basicCase.id}`));
    await waitForEuiPopoverOpen();

    await user.click(res.getByTestId(`case-action-status-panel-${basicCase.id}`));
    await waitForEuiContextMenuPanelTransition();

    expect(res.getByTestId('cases-bulk-action-status-open')).toBeInTheDocument();
    expect(res.getByTestId('cases-bulk-action-status-in-progress')).toBeInTheDocument();
    expect(res.getByTestId('cases-bulk-action-status-closed')).toBeInTheDocument();

    await user.click(res.getByTestId('cases-bulk-action-status-in-progress'));

    await waitFor(() => {
      expect(updateCasesSpy).toHaveBeenCalled();
    });
  });

  it('change the severity of the case', async () => {
    const updateCasesSpy = jest.spyOn(api, 'updateCases');

    const { result } = renderHook(() => useActions({ disableActions: false }), {
      wrapper: appMockRender.AppWrapper,
    });

    const comp = result.current.actions!.render(basicCase) as React.ReactElement;
    const res = appMockRender.render(comp);

    await user.click(res.getByTestId(`case-action-popover-button-${basicCase.id}`));
    await waitForEuiPopoverOpen();

    await user.click(res.getByTestId(`case-action-severity-panel-${basicCase.id}`));
    await waitForEuiContextMenuPanelTransition();

    expect(res.getByTestId('cases-bulk-action-severity-low')).toBeInTheDocument();
    expect(res.getByTestId('cases-bulk-action-severity-medium')).toBeInTheDocument();
    expect(res.getByTestId('cases-bulk-action-severity-high')).toBeInTheDocument();
    expect(res.getByTestId('cases-bulk-action-severity-critical')).toBeInTheDocument();

    await user.click(res.getByTestId('cases-bulk-action-severity-medium'));

    await waitFor(() => {
      expect(updateCasesSpy).toHaveBeenCalled();
    });
  });

  it('copies the case id to the clipboard', async () => {
    const originalClipboard = global.window.navigator.clipboard;

    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: jest.fn().mockImplementation(() => Promise.resolve()),
      },
      writable: true,
    });

    const { result } = renderHook(() => useActions({ disableActions: false }), {
      wrapper: appMockRender.AppWrapper,
    });

    const comp = result.current.actions!.render(basicCase) as React.ReactElement;
    const res = appMockRender.render(comp);

    await user.click(res.getByTestId(`case-action-popover-button-${basicCase.id}`));
    await waitForEuiPopoverOpen();

    await user.click(res.getByTestId('cases-action-copy-id'));

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(basicCase.id);

    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
    });
  });

  describe('Modals', () => {
    it('delete a case', async () => {
      const deleteSpy = jest.spyOn(api, 'deleteCases');

      const { result } = renderHook(() => useActions({ disableActions: false }), {
        wrapper: appMockRender.AppWrapper,
      });

      const comp = result.current.actions!.render(basicCase) as React.ReactElement;
      const res = appMockRender.render(comp);

      await user.click(res.getByTestId(`case-action-popover-button-${basicCase.id}`));
      await waitForEuiPopoverOpen();

      await user.click(res.getByTestId('cases-bulk-action-delete'));

      await waitFor(() => {
        expect(res.getByTestId('confirm-delete-case-modal')).toBeInTheDocument();
      });

      await user.click(res.getByTestId('confirmModalConfirmButton'));

      await waitFor(() => {
        expect(deleteSpy).toHaveBeenCalled();
      });
    });

    it('closes the modal', async () => {
      const { result } = renderHook(() => useActions({ disableActions: false }), {
        wrapper: appMockRender.AppWrapper,
      });

      const comp = result.current.actions!.render(basicCase) as React.ReactElement;
      const res = appMockRender.render(comp);

      await user.click(res.getByTestId(`case-action-popover-button-${basicCase.id}`));
      await waitForEuiPopoverOpen();

      await user.click(res.getByTestId('cases-bulk-action-delete'));

      await waitFor(() => {
        expect(res.getByTestId('confirm-delete-case-modal')).toBeInTheDocument();
      });

      await user.click(res.getByTestId('confirmModalCancelButton'));

      expect(res.queryByTestId('confirm-delete-case-modal')).toBeFalsy();
    });
  });

  describe('Flyouts', () => {
    it('change the tags of the case', async () => {
      const updateCasesSpy = jest.spyOn(api, 'updateCases');

      const { result } = renderHook(() => useActions({ disableActions: false }), {
        wrapper: appMockRender.AppWrapper,
      });

      const comp = result.current.actions!.render(basicCase) as React.ReactElement;
      const res = appMockRender.render(comp);

      await user.click(res.getByTestId(`case-action-popover-button-${basicCase.id}`));
      await waitForEuiPopoverOpen();

      await user.click(res.getByTestId('cases-bulk-action-tags'));

      await waitFor(() => {
        expect(res.getByTestId('cases-edit-tags-flyout')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(res.getByText('coke')).toBeInTheDocument();
      });

      await user.click(res.getByText('coke'));
      await user.click(res.getByTestId('cases-edit-tags-flyout-submit'));

      await waitFor(() => {
        expect(updateCasesSpy).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(res.queryByTestId('cases-edit-tags-flyout')).toBeFalsy();
      });
    });

    it('change the assignees of the case', async () => {
      const updateCasesSpy = jest.spyOn(api, 'updateCases');

      const { result } = renderHook(() => useActions({ disableActions: false }), {
        wrapper: appMockRender.AppWrapper,
      });

      const comp = result.current.actions!.render(basicCase) as React.ReactElement;
      const res = appMockRender.render(comp);

      await user.click(res.getByTestId(`case-action-popover-button-${basicCase.id}`));
      await waitForEuiPopoverOpen();

      await user.click(res.getByTestId('cases-bulk-action-assignees'));

      await waitFor(() => {
        expect(res.getByTestId('cases-edit-assignees-flyout')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(res.getByText('Damaged Raccoon')).toBeInTheDocument();
      });

      await user.click(res.getByText('Damaged Raccoon'));
      await user.click(res.getByTestId('cases-edit-assignees-flyout-submit'));

      await waitFor(() => {
        expect(updateCasesSpy).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(res.queryByTestId('cases-edit-assignees-flyout')).toBeFalsy();
      });
    });
  });

  describe('Permissions', () => {
    it('shows the correct actions with all permissions', async () => {
      appMockRender = createAppMockRenderer({ permissions: allCasesPermissions() });
      const { result } = renderHook(() => useActions({ disableActions: false }), {
        wrapper: appMockRender.AppWrapper,
      });

      const comp = result.current.actions!.render(basicCase) as React.ReactElement;
      const res = appMockRender.render(comp);

      await user.click(res.getByTestId(`case-action-popover-button-${basicCase.id}`));
      await waitForEuiPopoverOpen();

      expect(res.getByTestId(`case-action-status-panel-${basicCase.id}`)).toBeInTheDocument();
      expect(res.getByTestId(`case-action-severity-panel-${basicCase.id}`)).toBeInTheDocument();
      expect(res.getByTestId('cases-bulk-action-delete')).toBeInTheDocument();
      expect(res.getByTestId(`actions-separator-${basicCase.id}`)).toBeInTheDocument();
      expect(res.getByTestId('cases-action-copy-id')).toBeInTheDocument();
    });

    it('shows the correct actions with no delete permissions', async () => {
      appMockRender = createAppMockRenderer({ permissions: noDeleteCasesPermissions() });
      const { result } = renderHook(() => useActions({ disableActions: false }), {
        wrapper: appMockRender.AppWrapper,
      });

      const comp = result.current.actions!.render(basicCase) as React.ReactElement;
      const res = appMockRender.render(comp);

      await user.click(res.getByTestId(`case-action-popover-button-${basicCase.id}`));
      await waitForEuiPopoverOpen();

      expect(res.getByTestId(`case-action-status-panel-${basicCase.id}`)).toBeInTheDocument();
      expect(res.getByTestId(`case-action-severity-panel-${basicCase.id}`)).toBeInTheDocument();
      expect(res.getByTestId('cases-action-copy-id')).toBeInTheDocument();
      expect(res.queryByTestId('cases-bulk-action-delete')).toBeFalsy();
      expect(res.queryByTestId(`actions-separator-${basicCase.id}`)).toBeFalsy();
    });

    it('shows the correct actions with only delete permissions', async () => {
      appMockRender = createAppMockRenderer({ permissions: onlyDeleteCasesPermission() });
      const { result } = renderHook(() => useActions({ disableActions: false }), {
        wrapper: appMockRender.AppWrapper,
      });

      const comp = result.current.actions!.render(basicCase) as React.ReactElement;
      const res = appMockRender.render(comp);

      await user.click(res.getByTestId(`case-action-popover-button-${basicCase.id}`));
      await waitForEuiPopoverOpen();

      expect(res.queryByTestId(`case-action-status-panel-${basicCase.id}`)).toBeFalsy();
      expect(res.queryByTestId(`case-action-severity-panel-${basicCase.id}`)).toBeFalsy();
      expect(res.getByTestId('cases-action-copy-id')).toBeInTheDocument();
      expect(res.getByTestId('cases-bulk-action-delete')).toBeInTheDocument();
      expect(res.queryByTestId(`actions-separator-${basicCase.id}`)).toBeFalsy();
    });

    it('returns null if the user does not have update or delete permissions', async () => {
      appMockRender = createAppMockRenderer({ permissions: readCasesPermissions() });
      const { result } = renderHook(() => useActions({ disableActions: false }), {
        wrapper: appMockRender.AppWrapper,
      });

      expect(result.current.actions).toBe(null);
    });

    it('disables the action correctly', async () => {
      appMockRender = createAppMockRenderer({ permissions: onlyDeleteCasesPermission() });
      const { result } = renderHook(() => useActions({ disableActions: true }), {
        wrapper: appMockRender.AppWrapper,
      });

      const comp = result.current.actions!.render(basicCase) as React.ReactElement;
      const res = appMockRender.render(comp);

      await waitFor(() => {
        expect(res.getByTestId(`case-action-popover-button-${basicCase.id}`)).toBeDisabled();
      });
    });

    it('shows actions when user only has reopenCase permission and only when case is closed', async () => {
      appMockRender = createAppMockRenderer({
        permissions: {
          all: false,
          read: true,
          create: false,
          update: false,
          delete: false,
          reopenCase: true,
          push: false,
          connectors: true,
          settings: false,
          createComment: false,
          assign: false,
        },
      });

      const { result } = renderHook(() => useActions({ disableActions: false }), {
        wrapper: appMockRender.AppWrapper,
      });

      expect(result.current.actions).not.toBe(null);
      const caseWithClosedStatus = { ...basicCase, status: CaseStatuses.closed };
      const comp = result.current.actions!.render(caseWithClosedStatus) as React.ReactElement;
      const res = appMockRender.render(comp);

      await user.click(res.getByTestId(`case-action-popover-button-${basicCase.id}`));
      await waitForEuiPopoverOpen();

      expect(res.queryByTestId(`case-action-status-panel-${basicCase.id}`)).toBeInTheDocument();
      expect(res.queryByTestId(`case-action-severity-panel-${basicCase.id}`)).toBeFalsy();
      expect(res.queryByTestId('cases-bulk-action-delete')).toBeFalsy();
      expect(res.getByTestId('cases-action-copy-id')).toBeInTheDocument();
      expect(res.queryByTestId(`actions-separator-${basicCase.id}`)).toBeFalsy();
    });

    it('shows actions with combination of reopenCase and other permissions', async () => {
      appMockRender = createAppMockRenderer({
        permissions: {
          all: false,
          read: true,
          create: false,
          update: false,
          delete: true,
          reopenCase: true,
          push: false,
          connectors: true,
          settings: false,
          createComment: false,
          assign: false,
        },
      });

      const { result } = renderHook(() => useActions({ disableActions: false }), {
        wrapper: appMockRender.AppWrapper,
      });

      expect(result.current.actions).not.toBe(null);
      const caseWithClosedStatus = { ...basicCase, status: CaseStatuses.closed };

      const comp = result.current.actions!.render(caseWithClosedStatus) as React.ReactElement;
      const res = appMockRender.render(comp);

      await user.click(res.getByTestId(`case-action-popover-button-${basicCase.id}`));
      await waitForEuiPopoverOpen();

      expect(res.queryByTestId(`case-action-status-panel-${basicCase.id}`)).toBeInTheDocument();
      expect(res.queryByTestId(`case-action-severity-panel-${basicCase.id}`)).toBeFalsy();
      expect(res.getByTestId('cases-bulk-action-delete')).toBeInTheDocument();
      expect(res.getByTestId('cases-action-copy-id')).toBeInTheDocument();
    });

    it('shows no actions with everything false but read', async () => {
      appMockRender = createAppMockRenderer({
        permissions: {
          all: false,
          read: true,
          create: false,
          update: false,
          delete: false,
          reopenCase: false,
          push: false,
          connectors: true,
          settings: false,
          createComment: false,
          assign: false,
        },
      });

      const { result } = renderHook(() => useActions({ disableActions: false }), {
        wrapper: appMockRender.AppWrapper,
      });

      expect(result.current.actions).toBe(null);
    });
  });
});
