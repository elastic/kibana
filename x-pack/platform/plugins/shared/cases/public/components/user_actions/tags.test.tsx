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
import { createTagsUserActionBuilder } from './tags';
import { getMockBuilderArgs } from './mock';

vi.mock('../../common/lib/kibana');
vi.mock('../../common/navigation/hooks');

describe('createTagsUserActionBuilder ', () => {
  const builderArgs = getMockBuilderArgs();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly when adding a tag', async () => {
    const userAction = getUserAction('tags', UserActionActions.add);
    const builder = createTagsUserActionBuilder({
      ...builderArgs,
      userAction,
    });

    const createdUserAction = builder.build();
    render(
      <TestProviders>
        <EuiCommentList comments={createdUserAction} />
      </TestProviders>
    );

    expect(screen.getByText('added tags')).toBeInTheDocument();
    expect(screen.getByText('a tag')).toBeInTheDocument();
  });

  it('renders correctly when deleting a tag', async () => {
    const userAction = getUserAction('tags', UserActionActions.delete);
    const builder = createTagsUserActionBuilder({
      ...builderArgs,
      userAction,
    });

    const createdUserAction = builder.build();
    render(
      <TestProviders>
        <EuiCommentList comments={createdUserAction} />
      </TestProviders>
    );

    expect(screen.getByText('removed tags')).toBeInTheDocument();
    expect(screen.getByText('a tag')).toBeInTheDocument();
  });
});
