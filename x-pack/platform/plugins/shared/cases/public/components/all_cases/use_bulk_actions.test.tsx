/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiContextMenu } from '@elastic/eui';
import userEvent from '@testing-library/user-event';
import { waitFor, renderHook, screen } from '@testing-library/react';

import {
  allCasesPermissions,
  noDeleteCasesPermissions,
  onlyDeleteCasesPermission,
  noReopenCasesPermissions,
  onlyReopenCasesPermission,
  TestProviders,
  renderWithTestingProviders,
} from '../../common/mock';
import { useBulkActions } from './use_bulk_actions';
import * as api from '../../containers/api';
import { basicCase, basicCaseClosed } from '../../containers/mock';

jest.mock('../../containers/api');
jest.mock('../../containers/user_profiles/api');

describe('useBulkActions', () => {
  const onAction = jest.fn();
  const onActionSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Panels', () => {
    it('renders bulk actions', async () => {
      const { result } = renderHook(
        () => useBulkActions({ onAction, onActionSuccess, selectedCases: [basicCase] }),
        {
          wrapper: TestProviders,
        }
      );

      expect(result.current).toMatchInlineSnapshot(`
        Object {
          "flyouts": <React.Fragment />,
          "modals": <React.Fragment />,
          "panels": Array [
            Object {
              "id": 0,
              "items": Array [
                Object {
                  "data-test-subj": "case-bulk-action-status",
                  "disabled": false,
                  "key": "case-bulk-action-status",
                  "name": "Status",
                  "panel": 1,
                },
                Object {
                  "data-test-subj": "case-bulk-action-severity",
                  "disabled": false,
                  "key": "case-bulk-action-severity",
                  "name": "Severity",
                  "panel": 2,
                },
                Object {
                  "data-test-subj": "bulk-actions-separator",
                  "isSeparator": true,
                  "key": "bulk-actions-separator",
                },
                Object {
                  "data-test-subj": "cases-bulk-action-tags",
                  "disabled": false,
                  "icon": <EuiIcon
                    size="m"
                    type="tag"
                  />,
                  "key": "cases-bulk-action-tags",
                  "name": "Edit tags",
                  "onClick": [Function],
                },
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
                },
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
                },
              ],
              "title": "Actions",
            },
            Object {
              "id": 1,
              "items": Array [
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
                  "key": "cases-bulk-status-action",
                  "name": "Closed",
                  "onClick": [Function],
                },
              ],
              "title": "Status",
            },
            Object {
              "id": 2,
              "items": Array [
                Object {
                  "data-test-subj": "cases-bulk-action-severity-low",
                  "disabled": true,
                  "icon": "empty",
                  "key": "cases-bulk-action-severity-low",
                  "name": "Low",
                  "onClick": [Function],
                },
                Object {
                  "data-test-subj": "cases-bulk-action-severity-medium",
                  "disabled": false,
                  "icon": "empty",
                  "key": "cases-bulk-action-severity-medium",
                  "name": "Medium",
                  "onClick": [Function],
                },
                Object {
                  "data-test-subj": "cases-bulk-action-severity-high",
                  "disabled": false,
                  "icon": "empty",
                  "key": "cases-bulk-action-severity-high",
                  "name": "High",
                  "onClick": [Function],
                },
                Object {
                  "data-test-subj": "cases-bulk-action-severity-critical",
                  "disabled": false,
                  "icon": "empty",
                  "key": "cases-bulk-action-severity-critical",
                  "name": "Critical",
                  "onClick": [Function],
                },
              ],
              "title": "Severity",
            },
          ],
        }
      `);
    });

    it('change the status of cases', async () => {
      const updateCasesSpy = jest.spyOn(api, 'updateCases');

      const { result } = renderHook(
        () => useBulkActions({ onAction, onActionSuccess, selectedCases: [basicCase] }),
        {
          wrapper: TestProviders,
        }
      );

      const modals = result.current.modals;
      const panels = result.current.panels;

      renderWithTestingProviders(
        <>
          <EuiContextMenu initialPanelId={0} panels={panels} />
          {modals}
        </>
      );

      await userEvent.click(screen.getByTestId('case-bulk-action-status'));

      expect(await screen.findByTestId('cases-bulk-action-status-open')).toBeInTheDocument();

      expect(screen.getByTestId('cases-bulk-action-status-in-progress')).toBeInTheDocument();
      expect(screen.getByTestId('cases-bulk-action-status-closed')).toBeInTheDocument();

      await userEvent.click(screen.getByTestId('cases-bulk-action-status-in-progress'), {
        pointerEventsCheck: 0,
      });

      await waitFor(() => {
        expect(updateCasesSpy).toHaveBeenCalled();
      });
    });

    it('change the severity of cases', async () => {
      const updateCasesSpy = jest.spyOn(api, 'updateCases');

      const { result } = renderHook(
        () => useBulkActions({ onAction, onActionSuccess, selectedCases: [basicCase] }),
        {
          wrapper: TestProviders,
        }
      );

      const modals = result.current.modals;
      const panels = result.current.panels;

      renderWithTestingProviders(
        <>
          <EuiContextMenu initialPanelId={0} panels={panels} />
          {modals}
        </>
      );

      await userEvent.click(screen.getByTestId('case-bulk-action-severity'));

      expect(await screen.findByTestId('cases-bulk-action-severity-low')).toBeInTheDocument();

      expect(screen.getByTestId('cases-bulk-action-severity-medium')).toBeInTheDocument();
      expect(screen.getByTestId('cases-bulk-action-severity-high')).toBeInTheDocument();
      expect(screen.getByTestId('cases-bulk-action-severity-critical')).toBeInTheDocument();

      await userEvent.click(screen.getByTestId('cases-bulk-action-severity-medium'), {
        pointerEventsCheck: 0,
      });

      await waitFor(() => {
        expect(updateCasesSpy).toHaveBeenCalled();
      });
    });

    describe('Modals', () => {
      it('delete a case', async () => {
        const deleteSpy = jest.spyOn(api, 'deleteCases');

        const { result } = renderHook(
          () => useBulkActions({ onAction, onActionSuccess, selectedCases: [basicCase] }),
          {
            wrapper: TestProviders,
          }
        );

        let modals = result.current.modals;
        const panels = result.current.panels;

        const { rerender } = renderWithTestingProviders(
          <>
            <EuiContextMenu initialPanelId={0} panels={panels} />
            {modals}
          </>
        );

        await userEvent.click(screen.getByTestId('cases-bulk-action-delete'));

        modals = result.current.modals;
        rerender(
          <>
            <EuiContextMenu initialPanelId={0} panels={panels} />
            {modals}
          </>
        );

        await waitFor(() => {
          expect(screen.getByTestId('confirm-delete-case-modal')).toBeInTheDocument();
        });

        await userEvent.click(screen.getByTestId('confirmModalConfirmButton'));

        await waitFor(() => {
          expect(deleteSpy).toHaveBeenCalled();
        });
      });

      it('closes the modal', async () => {
        const { result } = renderHook(
          () => useBulkActions({ onAction, onActionSuccess, selectedCases: [basicCase] }),
          {
            wrapper: TestProviders,
          }
        );

        let modals = result.current.modals;
        const panels = result.current.panels;

        const { rerender } = renderWithTestingProviders(
          <>
            <EuiContextMenu initialPanelId={0} panels={panels} />
            {modals}
          </>
        );

        await userEvent.click(screen.getByTestId('cases-bulk-action-delete'));

        modals = result.current.modals;
        rerender(
          <>
            <EuiContextMenu initialPanelId={0} panels={panels} />
            {modals}
          </>
        );

        await waitFor(() => {
          expect(screen.getByTestId('confirm-delete-case-modal')).toBeInTheDocument();
        });

        await userEvent.click(screen.getByTestId('confirmModalCancelButton'));

        modals = result.current.modals;
        rerender(
          <>
            <EuiContextMenu initialPanelId={0} panels={panels} />
            {modals}
          </>
        );

        expect(screen.queryByTestId('confirm-delete-case-modal')).not.toBeInTheDocument();
      });
    });
  });

  describe('Flyouts', () => {
    it('change the tags of the case', async () => {
      const updateCasesSpy = jest.spyOn(api, 'updateCases');

      const { result } = renderHook(
        () => useBulkActions({ onAction, onActionSuccess, selectedCases: [basicCase] }),
        {
          wrapper: TestProviders,
        }
      );

      let flyouts = result.current.flyouts;
      const panels = result.current.panels;

      const { rerender } = renderWithTestingProviders(
        <>
          <EuiContextMenu initialPanelId={0} panels={panels} />
          {flyouts}
        </>
      );

      await userEvent.click(screen.getByTestId('cases-bulk-action-tags'));

      flyouts = result.current.flyouts;

      rerender(
        <>
          <EuiContextMenu initialPanelId={0} panels={panels} />
          {flyouts}
        </>
      );

      await waitFor(() => {
        expect(screen.getByTestId('cases-edit-tags-flyout')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText('coke')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByText('coke'));
      await userEvent.click(screen.getByTestId('cases-edit-tags-flyout-submit'));

      await waitFor(() => {
        expect(updateCasesSpy).toHaveBeenCalled();
      });
    });

    it('change the assignees of the case', async () => {
      const updateCasesSpy = jest.spyOn(api, 'updateCases');

      const { result } = renderHook(
        () => useBulkActions({ onAction, onActionSuccess, selectedCases: [basicCase] }),
        {
          wrapper: TestProviders,
        }
      );

      let flyouts = result.current.flyouts;
      const panels = result.current.panels;

      const { rerender } = renderWithTestingProviders(
        <>
          <EuiContextMenu initialPanelId={0} panels={panels} />
          {flyouts}
        </>
      );

      await userEvent.click(screen.getByTestId('cases-bulk-action-assignees'));

      flyouts = result.current.flyouts;

      rerender(
        <>
          <EuiContextMenu initialPanelId={0} panels={panels} />
          {flyouts}
        </>
      );

      await waitFor(() => {
        expect(screen.getByTestId('cases-edit-assignees-flyout')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText('Damaged Raccoon')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByText('Damaged Raccoon'));
      await userEvent.click(screen.getByTestId('cases-edit-assignees-flyout-submit'));

      await waitFor(() => {
        expect(updateCasesSpy).toHaveBeenCalled();
      });
    });
  });

  describe('Permissions', () => {
    it('shows the correct actions with all permissions', async () => {
      const { result } = renderHook(
        () => useBulkActions({ onAction, onActionSuccess, selectedCases: [basicCase] }),
        {
          wrapper: TestProviders,
        }
      );

      const modals = result.current.modals;
      const panels = result.current.panels;

      renderWithTestingProviders(
        <>
          <EuiContextMenu initialPanelId={0} panels={panels} />
          {modals}
        </>,
        { wrapperProps: { permissions: allCasesPermissions() } }
      );

      expect(await screen.findByTestId('case-bulk-action-status')).toBeInTheDocument();
      expect(screen.getByTestId('cases-bulk-action-delete')).toBeInTheDocument();
      expect(screen.getByTestId('bulk-actions-separator')).toBeInTheDocument();
    });

    it('shows the correct actions with no delete permissions', async () => {
      const { result } = renderHook(
        () => useBulkActions({ onAction, onActionSuccess, selectedCases: [basicCase] }),
        {
          wrapper: (props) => <TestProviders {...props} permissions={noDeleteCasesPermissions()} />,
        }
      );

      const modals = result.current.modals;
      const panels = result.current.panels;

      renderWithTestingProviders(
        <>
          <EuiContextMenu initialPanelId={0} panels={panels} />
          {modals}
        </>,
        { wrapperProps: { permissions: noDeleteCasesPermissions() } }
      );

      expect(await screen.findByTestId('case-bulk-action-status')).toBeInTheDocument();

      expect(screen.queryByTestId('cases-bulk-action-delete')).not.toBeInTheDocument();
      expect(screen.queryByTestId('bulk-actions-separator')).not.toBeInTheDocument();
    });

    it('shows the correct actions with only delete permissions', async () => {
      const { result } = renderHook(
        () => useBulkActions({ onAction, onActionSuccess, selectedCases: [basicCase] }),
        {
          wrapper: (props) => (
            <TestProviders {...props} permissions={onlyDeleteCasesPermission()} />
          ),
        }
      );

      const modals = result.current.modals;
      const panels = result.current.panels;

      renderWithTestingProviders(
        <>
          <EuiContextMenu initialPanelId={0} panels={panels} />
          {modals}
        </>,
        { wrapperProps: { permissions: onlyDeleteCasesPermission() } }
      );

      expect(screen.queryByTestId('case-bulk-action-status')).not.toBeInTheDocument();
      expect(screen.getByTestId('cases-bulk-action-delete')).toBeInTheDocument();
      expect(screen.queryByTestId('bulk-actions-separator')).not.toBeInTheDocument();
    });

    it('shows the correct actions with no reopen permissions', async () => {
      const { result } = renderHook(
        () => useBulkActions({ onAction, onActionSuccess, selectedCases: [basicCaseClosed] }),
        {
          wrapper: (props) => <TestProviders {...props} permissions={noReopenCasesPermissions()} />,
        }
      );

      const modals = result.current.modals;
      const panels = result.current.panels;

      renderWithTestingProviders(
        <>
          <EuiContextMenu initialPanelId={0} panels={panels} />
          {modals}
        </>,
        { wrapperProps: { permissions: noReopenCasesPermissions() } }
      );

      expect(await screen.findByTestId('case-bulk-action-status')).toBeInTheDocument();
      await userEvent.click(screen.getByTestId('case-bulk-action-status'));

      expect(await screen.findByTestId('cases-bulk-action-status-open')).toBeDisabled();
      expect(screen.queryByTestId('cases-bulk-action-status-in-progress')).toBeDisabled();
      expect(screen.queryByTestId('cases-bulk-action-status-closed')).toBeDisabled();
    });

    it('shows the correct actions with reopen permissions', async () => {
      const { result } = renderHook(
        () => useBulkActions({ onAction, onActionSuccess, selectedCases: [basicCaseClosed] }),
        {
          wrapper: (props) => (
            <TestProviders {...props} permissions={onlyReopenCasesPermission()} />
          ),
        }
      );

      const { modals, flyouts, panels } = result.current;
      renderWithTestingProviders(
        <>
          <EuiContextMenu initialPanelId={0} panels={panels} />
          {modals}
          {flyouts}
        </>,
        { wrapperProps: { permissions: onlyReopenCasesPermission() } }
      );

      expect(await screen.findByTestId('case-bulk-action-status')).toBeInTheDocument();
      expect(screen.getByTestId('case-bulk-action-severity')).toBeInTheDocument();
      expect(screen.queryByTestId('bulk-actions-separator')).not.toBeInTheDocument();
      expect(screen.queryByTestId('case-bulk-action-delete')).not.toBeInTheDocument();

      await userEvent.click(screen.getByTestId('case-bulk-action-status'));

      expect(await screen.findByTestId('cases-bulk-action-status-open')).not.toBeDisabled();
      expect(screen.queryByTestId('cases-bulk-action-status-in-progress')).not.toBeDisabled();
      expect(screen.queryByTestId('cases-bulk-action-status-closed')).not.toBeDisabled();
    });
  });
});
