/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCommentList } from '@elastic/eui';
import { screen } from '@testing-library/react';
import { WORKFLOWS_APP_ID } from '@kbn/deeplinks-workflows';

import { UserActionActions } from '../../../common/types/domain';
import { renderWithTestingProviders } from '../../common/mock';
import { useAppUrl } from '../../common/lib/kibana';
import { getUserAction } from '../../containers/mock';
import { getMockBuilderArgs } from './mock';
import { createWorkflowUserActionBuilder } from './workflow';

jest.mock('../../common/lib/kibana');
jest.mock('../../common/navigation/hooks');

describe('createWorkflowUserActionBuilder', () => {
  const builderArgs = getMockBuilderArgs();
  const getAppUrl = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    getAppUrl.mockReturnValue('/app/workflows/workflow-1?tab=executions&executionId=execution-1');
    jest.mocked(useAppUrl).mockReturnValue({ getAppUrl });
  });

  it.each([
    ['cases.case', 'case-1', 'against the case'],
    ['cases.observable', 'observable-1', 'against an observable'],
    ['cases.alert', 'alert-1', 'against an alert'],
    ['cases.alerts', 'case-1', 'against the alerts'],
    ['cases.comment', 'comment-1', 'against a comment'],
    ['cases.attachment', 'attachment-1', 'against an attachment'],
  ] as const)('renders the %s workflow origin without exposing its id', (type, id, label) => {
    const userAction = getUserAction('workflow', UserActionActions.create, {
      type: 'workflow',
      payload: {
        workflow: {
          id: 'workflow-1',
          name: 'Investigate host',
          executionId: 'execution-1',
        },
        origin: {
          type,
          id,
        },
      },
    });

    const builder = createWorkflowUserActionBuilder({ ...builderArgs, userAction });
    renderWithTestingProviders(<EuiCommentList comments={builder.build()} />);

    expect(screen.getByTestId(`workflow-create-action-${userAction.id}`)).toBeInTheDocument();
    expect(screen.getByLabelText('Workflow started')).toBeInTheDocument();
    expect(screen.queryByText('execution-1')).not.toBeInTheDocument();
    expect(screen.queryByText(id)).not.toBeInTheDocument();
    expect(useAppUrl).toHaveBeenCalledWith(WORKFLOWS_APP_ID);
    expect(getAppUrl).toHaveBeenCalledWith({
      path: '/workflow-1?tab=executions&executionId=execution-1',
    });
    const executionLink = screen.getByRole('link', { name: /Investigate host/ });
    expect(screen.getByText(label, { exact: false })).toBeInTheDocument();
    expect(executionLink).toHaveAttribute(
      'href',
      '/app/workflows/workflow-1?tab=executions&executionId=execution-1'
    );
    expect(executionLink).toHaveAttribute('target', '_blank');
  });
});
