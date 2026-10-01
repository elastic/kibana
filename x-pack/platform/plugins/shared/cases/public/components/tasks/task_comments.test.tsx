/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CaseTaskComment } from '../../../common/types/domain/task_comment/v1';
import {
  allCasesPermissions,
  noDeleteCasesPermissions,
  readCasesPermissions,
  renderWithTestingProviders,
} from '../../common/mock';
import * as hooks from '../../containers/use_case_tasks';
import { TaskComments } from './task_comments';

jest.mock('../../containers/use_case_tasks');
jest.mock('../../containers/user_profiles/use_bulk_get_user_profiles', () => ({
  useBulkGetUserProfiles: () => ({ data: new Map() }),
}));

const mockedHooks = hooks as jest.Mocked<typeof hooks>;

const comment: CaseTaskComment = {
  id: 'c-1',
  version: 'v1',
  task_id: 'task-1',
  case_id: 'case-1',
  comment: 'Gateway logs show **nothing** after 14:00.',
  owner: 'securitySolution',
  created_at: '2026-01-01T00:00:00.000Z',
  created_by: { username: 'jane', full_name: 'Jane Doe', email: null, profile_uid: 'u1' },
};

describe('TaskComments', () => {
  const addComment = jest.fn();
  const deleteComment = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockedHooks.useGetTaskComments.mockReturnValue({
      data: { comments: [comment], total: 1 },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof hooks.useGetTaskComments>);
    mockedHooks.useAddTaskComment.mockReturnValue({
      mutateAsync: addComment,
      isLoading: false,
    } as unknown as ReturnType<typeof hooks.useAddTaskComment>);
    mockedHooks.useDeleteTaskComment.mockReturnValue({
      mutateAsync: deleteComment,
      isLoading: false,
    } as unknown as ReturnType<typeof hooks.useDeleteTaskComment>);
  });

  it('renders the thread with author, time, and markdown', () => {
    renderWithTestingProviders(<TaskComments caseId="case-1" taskId="task-1" />, {
      wrapperProps: { permissions: allCasesPermissions() },
    });

    const entry = screen.getByTestId('cases-task-comment-c-1');
    expect(entry).toHaveTextContent('Jane Doe');
    expect(within(entry).getByText('nothing').tagName).toBe('STRONG');
    expect(screen.getByText('Comments (1)')).toBeInTheDocument();
  });

  it('adds a comment and clears the composer', async () => {
    renderWithTestingProviders(<TaskComments caseId="case-1" taskId="task-1" />, {
      wrapperProps: { permissions: allCasesPermissions() },
    });

    const submit = screen.getByTestId('cases-task-comment-submit');
    expect(submit).toBeDisabled();
    await userEvent.type(screen.getByTestId('cases-task-comment-input'), 'Checked the proxy too.');
    await userEvent.click(submit);

    expect(addComment).toHaveBeenCalledWith('Checked the proxy too.');
    expect(screen.getByTestId('cases-task-comment-input')).toHaveValue('');
  });

  it('hides the composer without the create comment privilege and delete without the delete privilege', () => {
    const { unmount } = renderWithTestingProviders(
      <TaskComments caseId="case-1" taskId="task-1" />,
      { wrapperProps: { permissions: readCasesPermissions() } }
    );
    expect(screen.queryByTestId('cases-task-comment-input')).not.toBeInTheDocument();
    expect(screen.queryByTestId('cases-task-comment-delete-c-1')).not.toBeInTheDocument();
    unmount();

    renderWithTestingProviders(<TaskComments caseId="case-1" taskId="task-1" />, {
      wrapperProps: { permissions: noDeleteCasesPermissions() },
    });
    expect(screen.getByTestId('cases-task-comment-input')).toBeInTheDocument();
    expect(screen.queryByTestId('cases-task-comment-delete-c-1')).not.toBeInTheDocument();
  });

  it('confirms before deleting a comment', async () => {
    renderWithTestingProviders(<TaskComments caseId="case-1" taskId="task-1" />, {
      wrapperProps: { permissions: allCasesPermissions() },
    });

    await userEvent.click(screen.getByTestId('cases-task-comment-delete-c-1'));
    expect(screen.getByText('Delete comment?')).toBeInTheDocument();
    await userEvent.click(screen.getByTestId('confirmModalConfirmButton'));
    expect(deleteComment).toHaveBeenCalledWith('c-1');
  });
});
