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
  noUpdateCasesPermissions,
  onlyDeleteCasesPermission,
  noReopenCasesPermissions,
  onlyReopenCasesPermission,
  TestProviders,
  renderWithTestingProviders,
} from '../../../common/mock';
import { useBulkActions } from './use_bulk_actions';
import * as api from '../../../containers/api';
import { basicCase, basicCaseClosed } from '../../../containers/mock';
import type { CasesUI } from '../../../containers/types';
import { KibanaServices } from '../../../common/lib/kibana';
import { MAX_CASES_PER_WORKFLOW_RUN } from '../../../../common/constants';
import type { CasesPermissions } from '../../../../common';
import * as i18n from '../translations';

jest.mock('../../../containers/api');
jest.mock('../../../containers/user_profiles/api');

const mockCanExecuteWorkflow = jest.fn(() => false);

jest.mock('@kbn/workflows-ui', () => {
  const actual = jest.requireActual('@kbn/workflows-ui');
  return {
    ...actual,
    useWorkflowsCapabilities: () => ({
      ...actual.useWorkflowsCapabilities(),
      canExecuteWorkflow: mockCanExecuteWorkflow(),
    }),
  };
});

jest.mock('../../workflows/run_case_workflow_modal', () => ({
  RunCaseWorkflowModal: () => <div data-test-subj="cases-run-workflow-modal" />,
}));

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
                    aria-hidden={true}
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
                    aria-hidden={true}
                    size="m"
                    type="user"
                  />,
                  "key": "cases-bulk-action-assignees",
                  "name": "Edit assignees",
                  "onClick": [Function],
                },
                Object {
                  "data-test-subj": "cases-bulk-action-delete",
                  "disabled": false,
                  "icon": <EuiIcon
                    aria-hidden={true}
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
                  "key": "cases-bulk-action-status-closed",
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
      expect(result.current.panels).toHaveLength(3);
      expect(result.current.panels[0].title).toBe('Actions');
      expect(result.current.panels[1].title).toBe('Status');
      expect(result.current.panels[2].title).toBe('Severity');
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

    it('shows the reason selector when closing from bulk actions', async () => {
      const { result } = renderHook(
        () =>
          useBulkActions({
            onAction,
            onActionSuccess,
            selectedCases: [
              {
                ...basicCase,
                totalAlerts: 2,
                settings: {
                  ...basicCase.settings,
                  syncAlerts: true,
                },
              },
            ],
          }),
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

      await userEvent.click(screen.getByTestId('case-bulk-action-status'));
      await userEvent.click(await screen.findByTestId('cases-bulk-action-status-closed'), {
        pointerEventsCheck: 0,
      });

      modals = result.current.modals;
      rerender(
        <>
          <EuiContextMenu initialPanelId={0} panels={panels} />
          {modals}
        </>
      );

      expect(
        await screen.findByRole('dialog', { name: i18n.CLOSE_CASE_MODAL_TITLE })
      ).toBeInTheDocument();
      expect(screen.getByText('Close without reason')).toBeInTheDocument();
    });

    it('closes without modal when sync alerts is off', async () => {
      const updateCasesSpy = jest.spyOn(api, 'updateCases');

      const { result } = renderHook(
        () =>
          useBulkActions({
            onAction,
            onActionSuccess,
            selectedCases: [
              {
                ...basicCase,
                totalAlerts: 2,
                settings: {
                  ...basicCase.settings,
                  syncAlerts: false,
                },
              },
            ],
          }),
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
      await userEvent.click(await screen.findByTestId('cases-bulk-action-status-closed'), {
        pointerEventsCheck: 0,
      });

      expect(
        screen.queryByRole('dialog', { name: i18n.CLOSE_CASE_MODAL_TITLE })
      ).not.toBeInTheDocument();

      await waitFor(() => {
        expect(updateCasesSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            cases: [
              expect.objectContaining({
                id: basicCase.id,
                status: 'closed',
                version: basicCase.version,
              }),
            ],
          })
        );
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

  describe('Run workflow', () => {
    let getConfigSpy: jest.SpyInstance;

    beforeEach(() => {
      getConfigSpy = jest
        .spyOn(KibanaServices, 'getConfig')
        .mockReturnValue({ runWorkflows: { enabled: true } } as ReturnType<
          typeof KibanaServices.getConfig
        >);
      mockCanExecuteWorkflow.mockReturnValue(true);
    });

    afterEach(() => {
      getConfigSpy.mockRestore();
      mockCanExecuteWorkflow.mockReturnValue(false);
    });

    const renderBulkActions = ({
      selectedCases = [basicCase],
      permissions = allCasesPermissions(),
    }: { selectedCases?: CasesUI; permissions?: CasesPermissions } = {}) =>
      renderHook(() => useBulkActions({ onAction, onActionSuccess, selectedCases }), {
        wrapper: (props) => <TestProviders {...props} permissions={permissions} />,
      });

    const findRunWorkflowItem = (panels: ReturnType<typeof useBulkActions>['panels']) =>
      panels[0].items?.find(({ key }) => key === 'cases-bulk-action-run-workflow');

    it('shows the run workflow action and opens the modal', async () => {
      const { result } = renderBulkActions();

      let modals = result.current.modals;
      const panels = result.current.panels;

      const { rerender } = renderWithTestingProviders(
        <>
          <EuiContextMenu initialPanelId={0} panels={panels} />
          {modals}
        </>
      );

      expect(screen.queryByTestId('cases-run-workflow-modal')).not.toBeInTheDocument();

      await userEvent.click(screen.getByTestId('cases-bulk-action-run-workflow'));

      modals = result.current.modals;
      rerender(
        <>
          <EuiContextMenu initialPanelId={0} panels={panels} />
          {modals}
        </>
      );

      expect(await screen.findByTestId('cases-run-workflow-modal')).toBeInTheDocument();
      expect(onAction).toHaveBeenCalled();
    });

    it(`disables the run workflow action when more than ${MAX_CASES_PER_WORKFLOW_RUN} cases are selected`, () => {
      const selectedCases = Array.from({ length: MAX_CASES_PER_WORKFLOW_RUN + 1 }, (_, index) => ({
        ...basicCase,
        id: `case-${index}`,
      }));

      const { result } = renderBulkActions({ selectedCases });

      expect(findRunWorkflowItem(result.current.panels)).toEqual(
        expect.objectContaining({ disabled: true })
      );
    });

    it('does not show the run workflow action when running workflows is disabled', () => {
      getConfigSpy.mockReturnValue(undefined);

      const { result } = renderBulkActions();

      expect(findRunWorkflowItem(result.current.panels)).toBeUndefined();
    });

    it('does not show the run workflow action without update permissions', () => {
      const { result } = renderBulkActions({ permissions: noUpdateCasesPermissions() });

      expect(findRunWorkflowItem(result.current.panels)).toBeUndefined();
    });

    it('does not show the run workflow action when the user cannot execute workflows', () => {
      mockCanExecuteWorkflow.mockReturnValue(false);

      const { result } = renderBulkActions();

      expect(findRunWorkflowItem(result.current.panels)).toBeUndefined();
    });
  });
});
