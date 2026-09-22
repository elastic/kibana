/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';

import { CommentActions } from './comment_actions';
import { CommentRenderingProvider } from '../../user_actions/comment/comment_rendering_context';
import type { CommentRenderingContextValue } from '../../user_actions/comment/comment_rendering_context';
import { renderWithTestingProviders } from '../../../common/mock';
import { getMockCommentRenderingContext } from '../../user_actions/mock';
import type { CommentActionsProps } from './comment_actions';

jest.mock('../../../common/lib/kibana');
jest.mock('../../../common/navigation/hooks');

const defaultProps: CommentActionsProps = {
  commentId: 'comment-1',
  content: 'This is a comment',
};

const utils = getMockCommentRenderingContext();

const USER_ACTION_ELLIPSES_TEST_ID = 'property-actions-user-action-ellipses';
const USER_ACTION_PENCIL_TEST_ID = 'property-actions-user-action-pencil';

const renderComponent = (
  props: CommentActionsProps = defaultProps,
  context: CommentRenderingContextValue = utils
) =>
  renderWithTestingProviders(
    <CommentRenderingProvider value={context}>
      <CommentActions {...props} />
    </CommentRenderingProvider>
  );

describe('CommentActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the property actions toolbar', async () => {
    renderComponent();
    expect(screen.getByTestId('property-actions-user-action')).toBeInTheDocument();
  });

  it('calls handleManageMarkdownEditId when edit is clicked', async () => {
    renderComponent();

    await userEvent.click(screen.getByTestId(USER_ACTION_ELLIPSES_TEST_ID));
    await waitForEuiPopoverOpen();

    await userEvent.click(screen.getByTestId(USER_ACTION_PENCIL_TEST_ID));

    await waitFor(() => {
      expect(utils.handleManageMarkdownEditId).toHaveBeenCalledWith('comment-1');
    });
  });

  it('calls handleDeleteComment when delete is clicked', async () => {
    renderComponent();

    await userEvent.click(screen.getByTestId(USER_ACTION_ELLIPSES_TEST_ID));
    await waitForEuiPopoverOpen();

    await userEvent.click(screen.getByTestId('property-actions-user-action-trash'));

    expect(await screen.findByTestId('property-actions-confirm-modal')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(utils.handleDeleteComment).toHaveBeenCalledWith('comment-1', 'Deleted comment');
    });
  });

  it('calls handleManageQuote when quote is clicked', async () => {
    renderComponent();

    await userEvent.click(screen.getByTestId(USER_ACTION_ELLIPSES_TEST_ID));
    await waitForEuiPopoverOpen();

    await userEvent.click(screen.getByTestId('property-actions-user-action-quote'));

    await waitFor(() => {
      expect(utils.handleManageQuote).toHaveBeenCalledWith('This is a comment');
    });
  });

  it('shows loading state when comment is loading', () => {
    renderComponent(
      undefined,
      getMockCommentRenderingContext({
        loadingCommentIds: ['comment-1'],
      })
    );

    expect(screen.getByTestId('user-action-title-loading')).toBeInTheDocument();
  });
});
