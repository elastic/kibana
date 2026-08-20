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

import { OBSERVABLE_TYPE_IPV4 } from '../../../common/constants';
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

  it('renders the observable type label and value when they are available', () => {
    const userAction = getUserAction('workflow', UserActionActions.create, {
      type: 'workflow',
      payload: {
        workflow: {
          id: 'workflow-1',
          name: 'Enrich observable',
          executionId: 'execution-1',
        },
        origin: {
          type: 'cases.observable',
          id: 'observable-1',
          typeKey: OBSERVABLE_TYPE_IPV4.key,
          value: '10.0.0.8',
        },
      },
    });

    const builder = createWorkflowUserActionBuilder({ ...builderArgs, userAction });
    renderWithTestingProviders(<EuiCommentList comments={builder.build()} />);

    expect(screen.getByText('IPv4: 10.0.0.8')).toBeInTheDocument();
  });

  it('renders the injected workflow activity action', () => {
    const origin = {
      type: 'cases.alert',
      id: 'alert-1',
      index: '.alerts-security.alerts-default',
    } as const;
    const userAction = getUserAction('workflow', UserActionActions.create, {
      type: 'workflow',
      payload: {
        workflow: {
          id: 'workflow-1',
          name: 'Investigate alert',
          executionId: 'execution-1',
        },
        origin,
      },
    });
    const renderWorkflowUserActionAction = jest.fn(() => (
      <button type="button">{'Show alert details'}</button>
    ));

    const builder = createWorkflowUserActionBuilder({
      ...builderArgs,
      userAction,
      renderWorkflowUserActionAction,
    });
    renderWithTestingProviders(<EuiCommentList comments={builder.build()} />);

    expect(renderWorkflowUserActionAction).toHaveBeenCalledWith({
      origin,
      userActionId: userAction.id,
    });
    expect(screen.getByRole('button', { name: 'Show alert details' })).toBeInTheDocument();
  });
});
