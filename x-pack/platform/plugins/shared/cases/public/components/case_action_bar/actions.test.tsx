/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  noDeleteCasesPermissions,
  noUpdateCasesPermissions,
  renderWithTestingProviders,
} from '../../common/mock';
import { basicCase, basicPush } from '../../containers/mock';
import { Actions } from './actions';
import * as i18n from '../case_view/translations';
import * as api from '../../containers/api';
import { KibanaServices } from '../../common/lib/kibana';
import type { CasesPermissions } from '../../../common';

jest.mock('../../containers/api');
jest.mock('./apply_template_modal', () => ({
  ApplyTemplateModal: () => <div data-test-subj="apply-template-modal" />,
}));
jest.mock('../workflows/run_case_workflow_modal', () => ({
  RunCaseWorkflowModal: () => <div data-test-subj="cases-run-workflow-modal" />,
}));

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

jest.mock('react-router-dom', () => {
  const original = jest.requireActual('react-router-dom');

  return {
    ...original,
    useHistory: () => ({
      useHistory: jest.fn(),
    }),
  };
});

const defaultProps = {
  caseData: basicCase,
  currentExternalIncident: null,
};

describe('CaseView actions', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    jest.resetAllMocks();
    // the popover menu is briefly `pointer-events: none` while it animates in
    user = userEvent.setup({ pointerEventsCheck: 0 });
  });

  it('clicking trash toggles modal', async () => {
    renderWithTestingProviders(<Actions {...defaultProps} />);

    expect(screen.queryByTestId('confirm-delete-case-modal')).not.toBeInTheDocument();
    await user.click(screen.getByTestId('property-actions-case-ellipses'));
    await user.click(screen.getByTestId('property-actions-case-trash'));
    expect(screen.getByTestId('confirm-delete-case-modal')).toBeInTheDocument();
  });

  it('clicking copy icon copies case id', async () => {
    const originalClipboard = global.window.navigator.clipboard;

    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: jest.fn().mockImplementation(() => Promise.resolve()),
      },
      writable: true,
    });

    renderWithTestingProviders(<Actions {...defaultProps} />);

    await user.click(screen.getByTestId('property-actions-case-ellipses'));
    await user.click(screen.getByTestId('property-actions-case-copy'));

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(basicCase.id);

    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
    });
  });

  it('does not show trash icon when user does not have deletion privileges', async () => {
    renderWithTestingProviders(<Actions {...defaultProps} />, {
      wrapperProps: { permissions: noDeleteCasesPermissions() },
    });

    expect(screen.queryByTestId('confirm-delete-case-modal')).not.toBeInTheDocument();
    await user.click(screen.getByTestId('property-actions-case-ellipses'));
    expect(screen.queryByTestId('property-actions-case-trash')).not.toBeInTheDocument();
    expect(screen.getByTestId('property-actions-case-copy')).toBeInTheDocument();
  });

  it('toggle delete modal and confirm', async () => {
    const deleteCasesSpy = jest
      .spyOn(api, 'deleteCases')
      .mockRejectedValue(new Error('useDeleteCases: Test error'));

    renderWithTestingProviders(<Actions {...defaultProps} />);

    await user.click(screen.getByTestId('property-actions-case-ellipses'));
    await user.click(screen.getByTestId('property-actions-case-trash'));

    expect(screen.getByTestId('confirm-delete-case-modal')).toBeInTheDocument();
    await user.click(screen.getByTestId('confirmModalConfirmButton'));

    await waitFor(() => {
      expect(deleteCasesSpy).toHaveBeenCalledWith({ caseIds: ['basic-case-id'] });
    });
  });

  describe('Apply template action', () => {
    const enableTemplatesV2 = () =>
      jest
        .spyOn(KibanaServices, 'getConfig')
        .mockReturnValue({ templates: { enabled: true } } as ReturnType<
          typeof KibanaServices.getConfig
        >);

    it('does not show the apply template action when templates v2 is disabled', async () => {
      jest.spyOn(KibanaServices, 'getConfig').mockReturnValue(undefined);

      renderWithTestingProviders(<Actions {...defaultProps} />);

      await user.click(screen.getByTestId('property-actions-case-ellipses'));

      expect(screen.queryByTestId('property-actions-case-indexEdit')).not.toBeInTheDocument();
    });

    it('shows the apply template action when templates v2 is enabled', async () => {
      enableTemplatesV2();

      renderWithTestingProviders(<Actions {...defaultProps} />);

      await user.click(screen.getByTestId('property-actions-case-ellipses'));

      expect(screen.getByTestId('property-actions-case-indexEdit')).toBeInTheDocument();
    });

    it('clicking apply template opens the modal', async () => {
      enableTemplatesV2();

      renderWithTestingProviders(<Actions {...defaultProps} />);

      expect(screen.queryByTestId('apply-template-modal')).not.toBeInTheDocument();

      await user.click(screen.getByTestId('property-actions-case-ellipses'));
      await user.click(screen.getByTestId('property-actions-case-indexEdit'));

      expect(screen.getByTestId('apply-template-modal')).toBeInTheDocument();
    });
  });

  describe('Run workflow action', () => {
    const enableRunWorkflows = () =>
      jest
        .spyOn(KibanaServices, 'getConfig')
        .mockReturnValue({ runWorkflows: { enabled: true } } as ReturnType<
          typeof KibanaServices.getConfig
        >);

    const openActions = async (permissions?: CasesPermissions) => {
      renderWithTestingProviders(<Actions {...defaultProps} />, {
        wrapperProps: { permissions },
      });

      await user.click(screen.getByTestId('property-actions-case-ellipses'));
    };

    beforeEach(() => {
      mockCanExecuteWorkflow.mockReturnValue(true);
    });

    it('shows the run workflow action and opens the modal', async () => {
      enableRunWorkflows();

      await openActions();

      expect(screen.queryByTestId('cases-run-workflow-modal')).not.toBeInTheDocument();

      await user.click(screen.getByTestId('property-actions-case-play'));

      expect(screen.getByTestId('cases-run-workflow-modal')).toBeInTheDocument();
    });

    it('does not show the run workflow action when running workflows is disabled', async () => {
      jest.spyOn(KibanaServices, 'getConfig').mockReturnValue(undefined);

      await openActions();

      expect(screen.queryByTestId('property-actions-case-play')).not.toBeInTheDocument();
    });

    it('does not show the run workflow action without update permissions', async () => {
      enableRunWorkflows();

      await openActions(noUpdateCasesPermissions());

      expect(screen.queryByTestId('property-actions-case-play')).not.toBeInTheDocument();
    });

    it('does not show the run workflow action when the user cannot execute workflows', async () => {
      enableRunWorkflows();
      mockCanExecuteWorkflow.mockReturnValue(false);

      await openActions();

      expect(screen.queryByTestId('property-actions-case-play')).not.toBeInTheDocument();
    });
  });

  it('displays active incident link', async () => {
    renderWithTestingProviders(
      <Actions {...defaultProps} currentExternalIncident={{ ...basicPush }} />
    );

    expect(screen.queryByTestId('confirm-delete-case-modal')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('property-actions-case-ellipses'));
    expect(screen.getByTestId('property-actions-case-external')).toHaveAttribute(
      'aria-label',
      i18n.VIEW_INCIDENT(basicPush.externalTitle)
    );
  });
});
