/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCommentList } from '@elastic/eui';
import { screen } from '@testing-library/react';

import { getUserAction } from '../../containers/mock';
import { renderWithTestingProviders } from '../../common/mock';
import { createTemplateUserActionBuilder } from './template';
import { getMockBuilderArgs } from './mock';
import { UserActionActions } from '../../../common/types/domain';

jest.mock('../../common/lib/kibana');
jest.mock('../../common/navigation/hooks');

describe('createTemplateUserActionBuilder', () => {
  const builderArgs = getMockBuilderArgs();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders "applied template" when a template is set', () => {
    const userAction = getUserAction('template', UserActionActions.update, {
      type: 'template',
      payload: { template: { id: 'tmpl-1', version: 3 } },
    });

    const builder = createTemplateUserActionBuilder({ ...builderArgs, userAction });
    renderWithTestingProviders(<EuiCommentList comments={builder.build()} />);

    expect(screen.getByText('applied template')).toBeInTheDocument();
  });

  it('renders "removed applied template" when template is null', () => {
    const userAction = getUserAction('template', UserActionActions.update, {
      type: 'template',
      payload: { template: null },
    });

    const builder = createTemplateUserActionBuilder({ ...builderArgs, userAction });
    renderWithTestingProviders(<EuiCommentList comments={builder.build()} />);

    expect(screen.getByText('removed applied template')).toBeInTheDocument();
  });
});
