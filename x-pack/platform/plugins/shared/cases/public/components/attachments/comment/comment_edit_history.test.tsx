/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { renderWithTestingProviders } from '../../../common/mock';
import { useGetAttachmentHistory } from '../../../containers/use_get_attachment_history';
import { CommentEditHistory } from './comment_edit_history';
import { useIsAuthor } from './use_is_author';

jest.mock('../../../common/lib/kibana');
jest.mock('../../../containers/use_get_attachment_history');
jest.mock('./use_is_author');

const useGetAttachmentHistoryMock = useGetAttachmentHistory as jest.Mock;
const useIsAuthorMock = useIsAuthor as jest.Mock;

const createdBy = { username: 'elastic', fullName: 'Elastic User', email: null };

const history = [
  {
    id: 'ua-1',
    action: 'create',
    type: 'comment',
    createdAt: '2026-11-09T10:00:00.000Z',
    createdBy,
    payload: { comment: { type: 'comment', owner: 'cases', data: { content: 'first text' } } },
  },
  {
    id: 'ua-2',
    action: 'update',
    type: 'comment',
    createdAt: '2026-11-09T11:00:00.000Z',
    createdBy,
    payload: { comment: { type: 'user', owner: 'cases', comment: 'first edit' } },
  },
];

const renderHistory = (editedBy = 'Elastic User') =>
  renderWithTestingProviders(
    <CommentEditHistory
      caseId="case-1"
      commentId="comment-1"
      createdBy={createdBy}
      editedBy={editedBy}
    />
  );

describe('CommentEditHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useGetAttachmentHistoryMock.mockReturnValue({ data: history, isLoading: false });
    useIsAuthorMock.mockReturnValue(true);
  });

  it('only shows the last edited label to users who did not write the comment', () => {
    useIsAuthorMock.mockReturnValue(false);
    renderHistory();

    expect(screen.getByTestId('comment-edit-history-label-comment-1')).toHaveTextContent(
      'Last edited by Elastic User'
    );
    expect(screen.queryByTestId('comment-edit-history-button-comment-1')).not.toBeInTheDocument();
    expect(useGetAttachmentHistoryMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ isEnabled: false })
    );
  });

  it('shows who last edited the comment', () => {
    renderHistory();

    expect(screen.getByTestId('comment-edit-history-button-comment-1')).toHaveTextContent(
      'Last edited by Elastic User'
    );
  });

  it('falls back to a generic label without an editor', () => {
    renderHistory('');

    expect(screen.getByTestId('comment-edit-history-button-comment-1')).toHaveTextContent(
      'Last edited'
    );
  });

  it('only fetches the history once the popover is open', async () => {
    renderHistory();

    expect(useGetAttachmentHistoryMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ isEnabled: false })
    );

    await userEvent.click(screen.getByTestId('comment-edit-history-button-comment-1'));

    expect(useGetAttachmentHistoryMock).toHaveBeenLastCalledWith({
      caseId: 'case-1',
      attachmentId: 'comment-1',
      isEnabled: true,
    });
  });

  it('diffs each edit against the version before it, for unified and legacy payloads', async () => {
    renderHistory();

    await userEvent.click(screen.getByTestId('comment-edit-history-button-comment-1'));
    await screen.findByTestId('comment-edit-history-comment-1');

    expect(screen.getAllByTestId('comment-content-diff')).toHaveLength(1);
    expect(screen.getByTestId('comment-content-diff-removed')).toHaveTextContent('text');
    expect(screen.getByTestId('comment-content-diff-added')).toHaveTextContent('edit');
    expect(screen.getByText('Current')).toBeInTheDocument();
    expect(screen.getByText('Original')).toBeInTheDocument();
  });
});
