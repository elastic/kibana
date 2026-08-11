/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';

import { CommentChildren } from './comment_children';
import { CommentRenderingProvider } from '../../user_actions/comment/comment_rendering_context';
import type { CommentRenderingContextValue } from '../../user_actions/comment/comment_rendering_context';
import { renderWithTestingProviders } from '../../../common/mock';
import { getMockCommentRenderingContext } from '../../user_actions/mock';
import type { CommentChildrenProps } from './comment_children';

jest.mock('../../../common/lib/kibana');
jest.mock('../../../common/navigation/hooks');

const defaultProps: CommentChildrenProps = {
  commentId: 'comment-1',
  content: 'This is a comment',
  caseId: 'case-1',
  version: 'WzQ3LDFd',
};

const utils = getMockCommentRenderingContext({
  appId: 'securitySolution',
  manageMarkdownEditIds: [],
  loadingCommentIds: [],
  commentRefs: { current: {} },
});

const renderComponent = (
  props: CommentChildrenProps = defaultProps,
  context: CommentRenderingContextValue = utils
) =>
  renderWithTestingProviders(
    <CommentRenderingProvider value={context}>
      <CommentChildren {...props} />
    </CommentRenderingProvider>
  );

describe('CommentChildren', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the comment content', () => {
    renderComponent();
    expect(screen.getByText('This is a comment')).toBeInTheDocument();
  });

  it('renders in view mode when not editing', () => {
    renderComponent();
    expect(screen.getByTestId('scrollable-markdown')).toBeInTheDocument();
    expect(screen.queryByTestId('editable-markdown-form')).not.toBeInTheDocument();
  });

  it('renders in edit mode when the comment id is in manageMarkdownEditIds', () => {
    renderComponent(undefined, {
      ...utils,
      manageMarkdownEditIds: ['comment-1'],
    });

    expect(screen.getByTestId('editable-markdown-form')).toBeInTheDocument();
  });

  it('does not show unsaved draft message when there is no draft', () => {
    renderComponent();
    expect(screen.queryByTestId('user-action-comment-unsaved-draft')).not.toBeInTheDocument();
  });

  it('shows unsaved draft message when a draft exists', () => {
    const draftKey = 'cases.securitySolution.case-1.comment-1.markdownEditor';
    sessionStorage.setItem(draftKey, 'Different content');

    renderComponent();

    expect(screen.getByTestId('user-action-comment-unsaved-draft')).toBeInTheDocument();
    expect(screen.getByText('You have unsaved edits for this comment')).toBeInTheDocument();

    sessionStorage.removeItem(draftKey);
  });

  it('does not show draft message when draft matches comment content', () => {
    const draftKey = 'cases.securitySolution.case-1.comment-1.markdownEditor';
    sessionStorage.setItem(draftKey, 'This is a comment');

    renderComponent();

    expect(screen.queryByTestId('user-action-comment-unsaved-draft')).not.toBeInTheDocument();
    sessionStorage.removeItem(draftKey);
  });

  it('renders without context', () => {
    renderWithTestingProviders(<CommentChildren {...defaultProps} />);
    expect(screen.getByText('This is a comment')).toBeInTheDocument();
  });
});
