/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCommentList } from '@elastic/eui';
import { screen } from '@testing-library/react';

import { UserActionActions, UserActionTypes } from '../../../common/types/domain';
import { renderWithTestingProviders } from '../../common/mock';
import { getUserAction } from '../../containers/mock';
import { getMockBuilderArgs } from './mock';
import { createWorkflowUserActionBuilder } from './workflow';
import {
  CASE_WORKFLOW_ORIGIN_TYPE,
  OBSERVABLE_WORKFLOW_ORIGIN_TYPE,
  ALERT_WORKFLOW_ORIGIN_TYPE,
  ALERTS_WORKFLOW_ORIGIN_TYPE,
} from '../../../common/types/domain/user_action/workflow/constants';
import { WorkflowsManagementUiActions } from '@kbn/workflows';

jest.mock('../../common/lib/kibana');
jest.mock('../../common/navigation/hooks');

// Bring in mocked modules so we can override per-test.
const mockUseKibana = jest.requireMock('../../common/lib/kibana').useKibana;
const mockUseAppUrl = jest.requireMock('../../common/lib/kibana').useAppUrl;

const MOCK_EXECUTION_HREF = 'http://localhost/app/workflows/wf-1?tab=executions&executionId=exec-1';

const buildAndRender = (payloadOverride?: Record<string, unknown>) => {
  const builderArgs = getMockBuilderArgs();
  const userAction = getUserAction(UserActionTypes.workflow, UserActionActions.create, {
    ...(payloadOverride != null ? { payload: payloadOverride } : {}),
  });

  const builder = createWorkflowUserActionBuilder({
    ...builderArgs,
    userAction,
  });

  renderWithTestingProviders(<EuiCommentList comments={builder.build()} />);
};

describe('createWorkflowUserActionBuilder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: no workflow capabilities → no link
    mockUseKibana.mockReturnValue({
      services: {
        application: {
          capabilities: {},
        },
      },
    });
    mockUseAppUrl.mockReturnValue({
      getAppUrl: jest.fn().mockReturnValue(MOCK_EXECUTION_HREF),
    });
  });

  describe('execution link visibility', () => {
    it('renders the workflow name as plain text when user has no Workflows capabilities', () => {
      buildAndRender();
      // The label renders; no execution link present without capabilities.
      expect(screen.getByTestId('workflow-user-action-label')).toBeInTheDocument();
      expect(screen.queryByTestId('workflow-execution-link')).toBeNull();
    });

    it('renders the workflow name as a link when user has both read and readExecution capabilities', () => {
      mockUseKibana.mockReturnValue({
        services: {
          application: {
            capabilities: {
              workflowsManagement: {
                [WorkflowsManagementUiActions.read]: true,
                [WorkflowsManagementUiActions.readExecution]: true,
              },
            },
          },
        },
      });

      buildAndRender();

      const link = screen.getByTestId('workflow-execution-link');
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', MOCK_EXECUTION_HREF);
    });

    it('does not render a link when only readWorkflow capability is present', () => {
      mockUseKibana.mockReturnValue({
        services: {
          application: {
            capabilities: {
              workflowsManagement: {
                [WorkflowsManagementUiActions.read]: true,
                [WorkflowsManagementUiActions.readExecution]: false,
              },
            },
          },
        },
      });

      buildAndRender();
      expect(screen.queryByTestId('workflow-execution-link')).toBeNull();
    });
  });

  describe('origin labels', () => {
    const WORKFLOW_NAME = 'My Workflow';
    const makePayload = (type: string, extra: Record<string, unknown> = {}) => ({
      workflow: { id: 'wf-1', name: WORKFLOW_NAME, executionId: 'exec-1' },
      origin: { type, id: 'x', ...extra },
    });

    it('renders the case origin label', () => {
      buildAndRender(makePayload(CASE_WORKFLOW_ORIGIN_TYPE));
      expect(screen.getByTestId('workflow-user-action-label')).toHaveTextContent(
        `ran ${WORKFLOW_NAME} on this case`
      );
    });

    it('renders the case label when the list-surface run has no origin', () => {
      buildAndRender({
        workflow: { id: 'wf-1', name: WORKFLOW_NAME, executionId: 'exec-1' },
      });
      expect(screen.getByTestId('workflow-user-action-label')).toHaveTextContent(
        `ran ${WORKFLOW_NAME} on this case`
      );
    });

    it('renders the observable origin label with type+value when enriched', () => {
      buildAndRender(
        makePayload(OBSERVABLE_WORKFLOW_ORIGIN_TYPE, { typeKey: 'ip', value: '1.2.3.4' })
      );
      // typeKey 'ip' has no builtin label, so the raw key is used as the type label.
      expect(screen.getByTestId('workflow-user-action-label')).toHaveTextContent(
        `ran ${WORKFLOW_NAME} on observable ip: 1.2.3.4`
      );
    });

    it('renders the observable fallback label when not enriched', () => {
      buildAndRender(makePayload(OBSERVABLE_WORKFLOW_ORIGIN_TYPE));
      expect(screen.getByTestId('workflow-user-action-label')).toHaveTextContent(
        `ran ${WORKFLOW_NAME} on an observable`
      );
    });

    it('renders the alert origin label', () => {
      buildAndRender(makePayload(ALERT_WORKFLOW_ORIGIN_TYPE));
      expect(screen.getByTestId('workflow-user-action-label')).toHaveTextContent(
        `ran ${WORKFLOW_NAME} on an alert`
      );
    });

    it('renders the alerts origin label', () => {
      buildAndRender(makePayload(ALERTS_WORKFLOW_ORIGIN_TYPE));
      expect(screen.getByTestId('workflow-user-action-label')).toHaveTextContent(
        `ran ${WORKFLOW_NAME} on alerts`
      );
    });
  });
});
