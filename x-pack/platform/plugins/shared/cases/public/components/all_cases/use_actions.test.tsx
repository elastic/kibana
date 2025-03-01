/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import userEvent, { type UserEvent } from '@testing-library/user-event';
import { waitFor, renderHook, screen } from '@testing-library/react';
import {
  waitForEuiPopoverOpen,
  waitForEuiContextMenuPanelTransition,
} from '@elastic/eui/lib/test/rtl';

import { useActions } from './use_actions';
import { basicCase } from '../../containers/mock';
import * as api from '../../containers/api';

import { CaseStatuses } from '../../../common/types/domain';
import {
  noDeleteCasesPermissions,
  onlyDeleteCasesPermission,
  allCasesPermissions,
  readCasesPermissions,
  TestProviders,
  renderWithTestingProviders,
} from '../../common/mock';
import React from 'react';

jest.mock('../../containers/api');
jest.mock('../../containers/user_profiles/api');

describe('useActions', () => {
  let user: UserEvent;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
    user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    jest.clearAllMocks();
  });

  it('renders column actions', async () => {
    const { result } = renderHook(() => useActions({ disableActions: false }), {
      wrapper: TestProviders,
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
      wrapper: TestProviders,
    });

    const comp = result.current.actions!.render(basicCase) as React.ReactElement;
    renderWithTestingProviders(comp);

    expect(screen.getByTestId(`case-action-popover-${basicCase.id}`)).toBeInTheDocument();
  });

  it('open the action popover', async () => {
    const { result } = renderHook(() => useActions({ disableActions: false }), {
      wrapper: TestProviders,
    });

    const comp = result.current.actions!.render(basicCase) as React.ReactElement;
    renderWithTestingProviders(comp);

    await user.click(screen.getByTestId(`case-action-popover-button-${basicCase.id}`));
    await waitForEuiPopoverOpen();

    expect(screen.getByText('Actions')).toBeInTheDocument();
    expect(screen.getByTestId(`case-action-status-panel-${basicCase.id}`)).toBeInTheDocument();
    expect(screen.getByTestId('cases-bulk-action-delete')).toBeInTheDocument();
    expect(screen.getByTestId('cases-action-copy-id')).toBeInTheDocument();
  });

  it('change the status of the case', async () => {
    const updateCasesSpy = jest.spyOn(api, 'updateCases');

    const { result } = renderHook(() => useActions({ disableActions: false }), {
      wrapper: TestProviders,
    });

    const comp = result.current.actions!.render(basicCase) as React.ReactElement;
    renderWithTestingProviders(comp);

    await user.click(screen.getByTestId(`case-action-popover-button-${basicCase.id}`));
    await waitForEuiPopoverOpen();

    await user.click(screen.getByTestId(`case-action-status-panel-${basicCase.id}`));
    await waitForEuiContextMenuPanelTransition();

    expect(screen.getByTestId('cases-bulk-action-status-open')).toBeInTheDocument();
    expect(screen.getByTestId('cases-bulk-action-status-in-progress')).toBeInTheDocument();
    expect(screen.getByTestId('cases-bulk-action-status-closed')).toBeInTheDocument();

    await user.click(screen.getByTestId('cases-bulk-action-status-in-progress'));

    await waitFor(() => {
      expect(updateCasesSpy).toHaveBeenCalled();
    });
  });

  it('change the severity of the case', async () => {
    const updateCasesSpy = jest.spyOn(api, 'updateCases');

    const { result } = renderHook(() => useActions({ disableActions: false }), {
      wrapper: TestProviders,
    });

    const comp = result.current.actions!.render(basicCase) as React.ReactElement;
    renderWithTestingProviders(comp);

    await user.click(screen.getByTestId(`case-action-popover-button-${basicCase.id}`));
    await waitForEuiPopoverOpen();

    await user.click(screen.getByTestId(`case-action-severity-panel-${basicCase.id}`));
    await waitForEuiContextMenuPanelTransition();

    expect(screen.getByTestId('cases-bulk-action-severity-low')).toBeInTheDocument();
    expect(screen.getByTestId('cases-bulk-action-severity-medium')).toBeInTheDocument();
    expect(screen.getByTestId('cases-bulk-action-severity-high')).toBeInTheDocument();
    expect(screen.getByTestId('cases-bulk-action-severity-critical')).toBeInTheDocument();

    await user.click(screen.getByTestId('cases-bulk-action-severity-medium'));

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
      wrapper: TestProviders,
    });

    const comp = result.current.actions!.render(basicCase) as React.ReactElement;
    renderWithTestingProviders(comp);

    await user.click(screen.getByTestId(`case-action-popover-button-${basicCase.id}`));
    await waitForEuiPopoverOpen();

    await user.click(screen.getByTestId('cases-action-copy-id'));

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(basicCase.id);

    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
    });
  });

  describe('Modals', () => {
    it('delete a case', async () => {
      const deleteSpy = jest.spyOn(api, 'deleteCases');

      const { result } = renderHook(() => useActions({ disableActions: false }), {
        wrapper: TestProviders,
      });

      const comp = result.current.actions!.render(basicCase) as React.ReactElement;
      renderWithTestingProviders(comp);

      await user.click(screen.getByTestId(`case-action-popover-button-${basicCase.id}`));
      await waitForEuiPopoverOpen();

      await user.click(screen.getByTestId('cases-bulk-action-delete'));

      await waitFor(() => {
        expect(screen.getByTestId('confirm-delete-case-modal')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('confirmModalConfirmButton'));

      await waitFor(() => {
        expect(deleteSpy).toHaveBeenCalled();
      });
    });

    it('closes the modal', async () => {
      const { result } = renderHook(() => useActions({ disableActions: false }), {
        wrapper: TestProviders,
      });

      const comp = result.current.actions!.render(basicCase) as React.ReactElement;
      renderWithTestingProviders(comp);

      await user.click(screen.getByTestId(`case-action-popover-button-${basicCase.id}`));
      await waitForEuiPopoverOpen();

      await user.click(screen.getByTestId('cases-bulk-action-delete'));

      await waitFor(() => {
        expect(screen.getByTestId('confirm-delete-case-modal')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('confirmModalCancelButton'));

      expect(screen.queryByTestId('confirm-delete-case-modal')).not.toBeInTheDocument();
    });
  });

  describe('Flyouts', () => {
    it('change the tags of the case', async () => {
      const updateCasesSpy = jest.spyOn(api, 'updateCases');

      const { result } = renderHook(() => useActions({ disableActions: false }), {
        wrapper: TestProviders,
      });

      const comp = result.current.actions!.render(basicCase) as React.ReactElement;
      renderWithTestingProviders(comp);

      await user.click(screen.getByTestId(`case-action-popover-button-${basicCase.id}`));
      await waitForEuiPopoverOpen();

      await user.click(screen.getByTestId('cases-bulk-action-tags'));

      await waitFor(() => {
        expect(screen.getByTestId('cases-edit-tags-flyout')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText('coke')).toBeInTheDocument();
      });

      await user.click(screen.getByText('coke'));
      await user.click(screen.getByTestId('cases-edit-tags-flyout-submit'));

      await waitFor(() => {
        expect(updateCasesSpy).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(screen.queryByTestId('cases-edit-tags-flyout')).not.toBeInTheDocument();
      });
    });

    it('change the assignees of the case', async () => {
      const updateCasesSpy = jest.spyOn(api, 'updateCases');

      const { result } = renderHook(() => useActions({ disableActions: false }), {
        wrapper: TestProviders,
      });

      const comp = result.current.actions!.render(basicCase) as React.ReactElement;
      renderWithTestingProviders(comp);

      await user.click(screen.getByTestId(`case-action-popover-button-${basicCase.id}`));
      await waitForEuiPopoverOpen();

      await user.click(screen.getByTestId('cases-bulk-action-assignees'));

      await waitFor(() => {
        expect(screen.getByTestId('cases-edit-assignees-flyout')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText('Damaged Raccoon')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Damaged Raccoon'));
      await user.click(screen.getByTestId('cases-edit-assignees-flyout-submit'));

      await waitFor(() => {
        expect(updateCasesSpy).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(screen.queryByTestId('cases-edit-assignees-flyout')).not.toBeInTheDocument();
      });
    });
  });

  describe('Permissions', () => {
    it('shows the correct actions with all permissions', async () => {
      const { result } = renderHook(() => useActions({ disableActions: false }), {
        wrapper: (props) => <TestProviders {...props} permissions={allCasesPermissions()} />,
      });

      const comp = result.current.actions!.render(basicCase) as React.ReactElement;
      renderWithTestingProviders(comp);

      await user.click(screen.getByTestId(`case-action-popover-button-${basicCase.id}`));
      await waitForEuiPopoverOpen();

      expect(screen.getByTestId(`case-action-status-panel-${basicCase.id}`)).toBeInTheDocument();
      expect(screen.getByTestId(`case-action-severity-panel-${basicCase.id}`)).toBeInTheDocument();
      expect(screen.getByTestId('cases-bulk-action-delete')).toBeInTheDocument();
      expect(screen.getByTestId(`actions-separator-${basicCase.id}`)).toBeInTheDocument();
      expect(screen.getByTestId('cases-action-copy-id')).toBeInTheDocument();
    });

    it('shows the correct actions with no delete permissions', async () => {
      const { result } = renderHook(() => useActions({ disableActions: false }), {
        wrapper: (props) => <TestProviders {...props} permissions={noDeleteCasesPermissions()} />,
      });

      const comp = result.current.actions!.render(basicCase) as React.ReactElement;
      renderWithTestingProviders(comp, {
        wrapperProps: { permissions: noDeleteCasesPermissions() },
      });

      await user.click(screen.getByTestId(`case-action-popover-button-${basicCase.id}`));
      await waitForEuiPopoverOpen();

      expect(screen.getByTestId(`case-action-status-panel-${basicCase.id}`)).toBeInTheDocument();
      expect(screen.getByTestId(`case-action-severity-panel-${basicCase.id}`)).toBeInTheDocument();
      expect(screen.getByTestId('cases-action-copy-id')).toBeInTheDocument();
      expect(screen.queryByTestId('cases-bulk-action-delete')).not.toBeInTheDocument();
      expect(screen.queryByTestId(`actions-separator-${basicCase.id}`)).not.toBeInTheDocument();
    });

    it('shows the correct actions with only delete permissions', async () => {
      const { result } = renderHook(() => useActions({ disableActions: false }), {
        wrapper: (props) => <TestProviders {...props} permissions={onlyDeleteCasesPermission()} />,
      });

      const comp = result.current.actions!.render(basicCase) as React.ReactElement;
      renderWithTestingProviders(comp, {
        wrapperProps: { permissions: onlyDeleteCasesPermission() },
      });

      await user.click(screen.getByTestId(`case-action-popover-button-${basicCase.id}`));
      await waitForEuiPopoverOpen();

      expect(
        screen.queryByTestId(`case-action-status-panel-${basicCase.id}`)
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId(`case-action-severity-panel-${basicCase.id}`)
      ).not.toBeInTheDocument();
      expect(screen.getByTestId('cases-action-copy-id')).toBeInTheDocument();
      expect(screen.getByTestId('cases-bulk-action-delete')).toBeInTheDocument();
      expect(screen.queryByTestId(`actions-separator-${basicCase.id}`)).not.toBeInTheDocument();
    });

    it('returns null if the user does not have update or delete permissions', async () => {
      const { result } = renderHook(() => useActions({ disableActions: false }), {
        wrapper: (props) => <TestProviders {...props} permissions={readCasesPermissions()} />,
      });

      expect(result.current.actions).toBe(null);
    });

    it('disables the action correctly', async () => {
      const { result } = renderHook(() => useActions({ disableActions: true }), {
        wrapper: (props) => <TestProviders {...props} permissions={onlyDeleteCasesPermission()} />,
      });

      const comp = result.current.actions!.render(basicCase) as React.ReactElement;
      renderWithTestingProviders(comp, {
        wrapperProps: { permissions: onlyDeleteCasesPermission() },
      });

      await waitFor(() => {
        expect(screen.getByTestId(`case-action-popover-button-${basicCase.id}`)).toBeDisabled();
      });
    });

    it('shows actions when user only has reopenCase permission and only when case is closed', async () => {
      const permissions = {
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
      };

      const { result } = renderHook(() => useActions({ disableActions: false }), {
        wrapper: (props) => <TestProviders {...props} permissions={permissions} />,
      });

      expect(result.current.actions).not.toBe(null);
      const caseWithClosedStatus = { ...basicCase, status: CaseStatuses.closed };
      const comp = result.current.actions!.render(caseWithClosedStatus) as React.ReactElement;
      renderWithTestingProviders(comp, {
        wrapperProps: { permissions },
      });

      await user.click(screen.getByTestId(`case-action-popover-button-${basicCase.id}`));
      await waitForEuiPopoverOpen();

      expect(screen.getByTestId(`case-action-status-panel-${basicCase.id}`)).toBeInTheDocument();
      expect(
        screen.queryByTestId(`case-action-severity-panel-${basicCase.id}`)
      ).not.toBeInTheDocument();
      expect(screen.queryByTestId('cases-bulk-action-delete')).not.toBeInTheDocument();
      expect(screen.getByTestId('cases-action-copy-id')).toBeInTheDocument();
      expect(screen.queryByTestId(`actions-separator-${basicCase.id}`)).not.toBeInTheDocument();
    });

    it('shows actions with combination of reopenCase and other permissions', async () => {
      const permissions = {
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
      };

      const { result } = renderHook(() => useActions({ disableActions: false }), {
        wrapper: (props) => <TestProviders {...props} permissions={permissions} />,
      });

      expect(result.current.actions).not.toBe(null);
      const caseWithClosedStatus = { ...basicCase, status: CaseStatuses.closed };

      const comp = result.current.actions!.render(caseWithClosedStatus) as React.ReactElement;
      renderWithTestingProviders(comp, {
        wrapperProps: { permissions },
      });

      await user.click(screen.getByTestId(`case-action-popover-button-${basicCase.id}`));
      await waitForEuiPopoverOpen();

      expect(screen.getByTestId(`case-action-status-panel-${basicCase.id}`)).toBeInTheDocument();
      expect(
        screen.queryByTestId(`case-action-severity-panel-${basicCase.id}`)
      ).not.toBeInTheDocument();
      expect(screen.getByTestId('cases-bulk-action-delete')).toBeInTheDocument();
      expect(screen.getByTestId('cases-action-copy-id')).toBeInTheDocument();
    });

    it('shows no actions with everything false but read', async () => {
      const permissions = {
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
      };

      const { result } = renderHook(() => useActions({ disableActions: false }), {
        wrapper: (props) => <TestProviders {...props} permissions={permissions} />,
      });

      expect(result.current.actions).toBe(null);
    });
  });
});
