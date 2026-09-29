/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { EuiCommentList } from '@elastic/eui';
import { render, screen } from '@testing-library/react';

import { UserActionActions } from '../../../common/types/domain';
import { getUserAction } from '../../containers/mock';
import { TestProviders } from '../../common/mock';
import { createDescriptionUserActionBuilder } from './description';
import { getMockBuilderArgs } from './mock';

vi.mock('../../common/lib/kibana');
vi.mock('../../common/navigation/hooks');

describe('createDescriptionUserActionBuilder ', () => {
  const builderArgs = getMockBuilderArgs();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly', async () => {
    const userAction = getUserAction('description', UserActionActions.update);
    // @ts-ignore no need to pass all the arguments
    const builder = createDescriptionUserActionBuilder({
      ...builderArgs,
      userAction,
    });

    const createdUserAction = builder.build();
    render(
      <TestProviders>
        <EuiCommentList comments={createdUserAction} />
      </TestProviders>
    );

    expect(screen.getByText('edited description')).toBeInTheDocument();
  });
});
