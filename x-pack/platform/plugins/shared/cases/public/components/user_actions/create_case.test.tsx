/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCommentList } from '@elastic/eui';
import { render, screen } from '@testing-library/react';

import { UserActionActions } from '../../../common/types/domain';
import { getUserAction } from '../../containers/mock';
import { TestProviders } from '../../common/mock';
import { createCaseUserActionBuilder } from './create_case';
import { getMockBuilderArgs } from './mock';

jest.mock('../../common/lib/kibana');
jest.mock('../../common/navigation/hooks');

describe('createCaseUserActionBuilder ', () => {
  const builderArgs = getMockBuilderArgs();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', async () => {
    const userAction = getUserAction('create_case', UserActionActions.create);
    // @ts-ignore no need to pass all the arguments
    const builder = createCaseUserActionBuilder({
      ...builderArgs,
      userAction,
    });

    const createdUserAction = builder.build();
    render(
      <TestProviders>
        <EuiCommentList comments={createdUserAction} />
      </TestProviders>
    );

    expect(screen.getByText('created case "a title"')).toBeInTheDocument();
  });

  it('appends the action source to the create event', () => {
    const userAction = getUserAction('create_case', UserActionActions.create, {
      source: { type: 'agent', id: 'agent-1', name: 'Elastic AI Agent' },
    });
    // @ts-ignore no need to pass all the arguments
    const builder = createCaseUserActionBuilder({
      ...builderArgs,
      userAction,
    });

    render(
      <TestProviders>
        <EuiCommentList comments={builder.build()} />
      </TestProviders>
    );

    expect(screen.getByText(/created case "a title"/)).toBeInTheDocument();
    expect(screen.getByTestId('user-action-via-source')).toHaveTextContent('via Elastic AI Agent');
  });
});
