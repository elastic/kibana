/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { basicCase } from '../../../containers/mock';
import { UserActionsList } from './user_actions_list';
import { renderWithTestingProviders } from '../../../common/mock';

const actionsHandlerMock = {
  loadingCommentIds: [],
  selectedOutlineCommentId: '',
  manageMarkdownEditIds: [],
  commentRefs: { current: {} },
  handleManageMarkdownEditId: jest.fn(),
  handleOutlineComment: jest.fn(),
  handleSaveComment: jest.fn(),
  handleDeleteComment: jest.fn(),
  handleManageQuote: jest.fn(),
  handleUpdate: jest.fn(),
};

const defaultProps = {
  comments: [] as React.ComponentProps<typeof UserActionsList>['comments'],
  commentRefs: { current: {} },
  handleManageQuote: jest.fn(),
  caseData: basicCase,
  userProfiles: new Map(),
  actionsHandler: actionsHandlerMock,
};

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ detailName: 'case-id' }),
}));

jest.mock('../../../common/lib/kibana');

describe('UserActionsList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders list correctly', async () => {
    renderWithTestingProviders(<UserActionsList {...defaultProps} />);

    expect(await screen.findByTestId('user-actions-list')).toBeInTheDocument();
  });

  it('renders provided comments', async () => {
    const comments = [
      {
        username: 'elastic',
        children: <div data-test-subj="test-comment">{'Test comment'}</div>,
      },
    ];

    renderWithTestingProviders(<UserActionsList {...defaultProps} comments={comments} />);

    expect(await screen.findByTestId('test-comment')).toBeInTheDocument();
  });

  it('collapses an activity comment without affecting other activities or the comment editor', async () => {
    const comments = [
      {
        username: 'elastic',
        'data-test-subj': 'comment-alert-security.alert',
        children: <div data-test-subj="test-comment">{'Test comment'}</div>,
      },
      {
        username: 'elastic',
        'data-test-subj': 'comment-alert-security.alert',
        children: <div data-test-subj="second-test-comment">{'Second test comment'}</div>,
      },
      {
        username: 'elastic',
        className: 'isEdit',
        children: <div data-test-subj="comment-editor">{'Comment editor'}</div>,
      },
    ];

    renderWithTestingProviders(<UserActionsList {...defaultProps} comments={comments} />);

    await userEvent.click(await screen.findByTestId('case-user-action-collapse-0'));

    // Collapsed, the body is cropped to a preview rather than removed, so the row still says what
    // it holds — and the crop is inert, so nothing inside it is reachable.
    const preview = await screen.findByTestId('case-user-action-preview-0');
    expect(preview).toContainElement(screen.getByTestId('test-comment'));
    // The crop is the inert part; the wrapper stays reachable for the "Show more" control.
    expect(screen.getByTestId('case-user-action-preview-0-crop')).toHaveAttribute('inert');
    expect(screen.queryByTestId('case-user-action-preview-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('second-test-comment')).toBeInTheDocument();
    expect(screen.getByTestId('comment-editor')).toBeInTheDocument();
    expect(screen.queryByTestId('case-user-action-collapse-2')).not.toBeInTheDocument();

    await userEvent.click(await screen.findByTestId('case-user-action-collapse-0'));

    expect(await screen.findByTestId('test-comment')).toBeInTheDocument();
    expect(screen.queryByTestId('case-user-action-preview-0')).not.toBeInTheDocument();
  });
});
