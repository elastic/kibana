/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';

import {
  basicCaseWithUnifiedComments,
  basicCommentUnified,
  caseUserActions,
} from '../../containers/mock';
import { UserActionsList } from './user_actions_list';

import { getCaseConnectorsMockResponse } from '../../common/mock/connectors';
import { getMockBuilderArgs } from './mock';
import { renderWithTestingProviders } from '../../common/mock';

const builderArgs = getMockBuilderArgs();

const defaultProps = {
  caseUserActions,
  ...builderArgs,
  attachments: [basicCommentUnified],
  caseConnectors: getCaseConnectorsMockResponse(),
  data: basicCaseWithUnifiedComments,
  manualAlertsData: { 'some-id': { _id: 'some-id' } },
  commentRefs: { current: {} },
  handleManageQuote: jest.fn(),
};

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'), // use actual for all non-hook parts
  useParams: () => ({ detailName: 'case-id' }),
}));

jest.mock('../../common/lib/kibana');

const renderUserActionsList = (
  props: React.ComponentProps<typeof UserActionsList> = defaultProps
) =>
  renderWithTestingProviders(<UserActionsList {...props} />, {
    wrapperProps: {
      unifiedAttachmentTypeRegistry: builderArgs.unifiedAttachmentTypeRegistry,
    },
  });

describe(`UserActionsList`, () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders list correctly with isExpandable option', async () => {
    renderUserActionsList({ ...defaultProps, isExpandable: true });

    expect(await screen.findByTestId('user-actions-list')).toBeInTheDocument();
  });

  it('renders list correctly with isExpandable=false option', async () => {
    renderUserActionsList();

    expect(await screen.findByTestId('user-actions-list')).toBeInTheDocument();
  });

  it('renders user actions correctly', async () => {
    renderUserActionsList();

    expect(await screen.findByTestId(`description-create-action-${caseUserActions[0].id}`));
    expect(
      await screen.findByTestId(`comment-${basicCommentUnified.type}-${basicCommentUnified.type}`)
    );
    expect(await screen.findByTestId(`description-update-action-${caseUserActions[2].id}`));
  });

  it('renders bottom actions correctly', async () => {
    const userName = 'Username';
    const sample = 'This is an add comment bottom actions';

    const bottomActions = [
      {
        username: <div>{userName}</div>,
        'data-test-subj': 'add-comment',
        timelineAvatar: null,
        className: 'isEdit',
        children: <span>{sample}</span>,
      },
    ];

    renderUserActionsList({ ...defaultProps, bottomActions });

    expect(await screen.findByTestId('user-actions-list')).toBeInTheDocument();
    expect(await screen.findByTestId('add-comment')).toBeInTheDocument();
  });
});
