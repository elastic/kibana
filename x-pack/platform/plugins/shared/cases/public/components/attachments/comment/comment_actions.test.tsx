/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ComponentProps } from 'react';
import { render } from '@testing-library/react';

import { CommentActions } from './comment_actions';
import { CommentRenderingProvider } from '../../user_actions/comment/comment_rendering_context';
import type { CommentRenderingContextValue } from '../../user_actions/comment/comment_rendering_context';
import { getMockCommentRenderingContext } from '../../user_actions/mock';
import { UserCommentPropertyActions } from '../../user_actions/property_actions/user_comment_property_actions';
import type { CommentActionsProps } from './comment_actions';

jest.mock('../../user_actions/property_actions/user_comment_property_actions', () => ({
  UserCommentPropertyActions: jest.fn(() => null),
}));

const propertyActionsMock = UserCommentPropertyActions as unknown as jest.Mock;

const defaultProps: CommentActionsProps = {
  commentId: 'comment-1',
  content: 'This is a comment',
};

const utils = getMockCommentRenderingContext();

const renderComponent = (
  props: CommentActionsProps = defaultProps,
  context: CommentRenderingContextValue = utils
) =>
  render(
    <CommentRenderingProvider value={context}>
      <CommentActions {...props} />
    </CommentRenderingProvider>
  );

const getPropertyActionsProps = (): ComponentProps<typeof UserCommentPropertyActions> =>
  propertyActionsMock.mock.calls[0][0];

describe('CommentActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the property actions with the comment content', () => {
    renderComponent();

    expect(getPropertyActionsProps().commentContent).toBe('This is a comment');
    expect(getPropertyActionsProps().isLoading).toBe(false);
  });

  it('calls handleManageMarkdownEditId when edit is triggered', () => {
    renderComponent();

    getPropertyActionsProps().onEdit();

    expect(utils.handleManageMarkdownEditId).toHaveBeenCalledWith('comment-1');
  });

  it('calls handleDeleteComment when delete is triggered', () => {
    renderComponent();

    getPropertyActionsProps().onDelete();

    expect(utils.handleDeleteComment).toHaveBeenCalledWith('comment-1', 'Deleted comment');
  });

  it('calls handleManageQuote when quote is triggered', () => {
    renderComponent();

    getPropertyActionsProps().onQuote();

    expect(utils.handleManageQuote).toHaveBeenCalledWith('This is a comment');
  });

  it('passes the loading state when the comment is loading', () => {
    renderComponent(
      undefined,
      getMockCommentRenderingContext({
        loadingCommentIds: ['comment-1'],
      })
    );

    expect(getPropertyActionsProps().isLoading).toBe(true);
  });
});
