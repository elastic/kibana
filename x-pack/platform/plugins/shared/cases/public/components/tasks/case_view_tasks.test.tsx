/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CaseTask } from '../../../common/types/domain/task/v1';
import {
  allCasesPermissions,
  noDeleteCasesPermissions,
  readCasesPermissions,
  renderWithTestingProviders,
} from '../../common/mock';
import * as hooks from '../../containers/use_case_tasks';
import { CaseViewTasks } from './case_view_tasks';
import { orderTasks } from './tasks_table';

jest.mock('../../containers/use_case_tasks');
jest.mock('../case_view/components/sidebar/sidebar_toggle_button', () => ({
  SidebarToggleButton: () => null,
}));
jest.mock('../../containers/user_profiles/use_bulk_get_user_profiles', () => ({
  useBulkGetUserProfiles: () => ({ data: new Map() }),
}));

const task = (overrides: Partial<CaseTask>): CaseTask => ({
  id: 'task-1',
  version: 'v1',
  title: 'Block sender',
  description: '',
  case_id: 'case-1',
  parent_task_id: null,
  status: 'open',
  priority: 'medium',
  assignees: [],
  due_date: null,
  required: false,
  started_at: null,
  completed_at: null,
  sort_order: 1000,
  template_id: null,
  owner: 'securitySolution',
  created_at: '2024-01-01T00:00:00.000Z',
  created_by: { username: 'elastic', full_name: null, email: null, profile_uid: 'u1' },
  updated_at: null,
  updated_by: null,
  ...overrides,
});

const tasks = [
  task({ id: 'root-2', title: 'Notify legal', sort_order: 2000, status: 'completed' }),
  task({ id: 'root-1', title: 'Block sender', sort_order: 1000, assignees: [{ uid: 'u1' }] }),
  task({ id: 'child-1', title: 'Update blocklist', parent_task_id: 'root-1', sort_order: 1000 }),
  task({
    id: 'root-3',
    title: 'Reset credentials',
    sort_order: 3000,
    status: 'in_progress',
    due_date: '2000-01-01T00:00:00.000Z',
  }),
];

const mockedHooks = hooks as jest.Mocked<typeof hooks>;
const updateTask = jest.fn();
const refetch = jest.fn();

const mockTasksQuery = (overrides: Partial<ReturnType<typeof hooks.useGetCaseTasks>> = {}) =>
  mockedHooks.useGetCaseTasks.mockReturnValue({
    data: { tasks, comment_counts: { 'root-1': 2 } },
    isLoading: false,
    isError: false,
    refetch,
    ...overrides,
  } as unknown as ReturnType<typeof hooks.useGetCaseTasks>);

describe('CaseViewTasks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTasksQuery();
    mockedHooks.useUpdateTask.mockReturnValue({
      mutate: updateTask,
      mutateAsync: updateTask,
      isLoading: false,
    } as unknown as ReturnType<typeof hooks.useUpdateTask>);
    mockedHooks.useDeleteTask.mockReturnValue({
      mutateAsync: jest.fn(),
      isLoading: false,
    } as unknown as ReturnType<typeof hooks.useDeleteTask>);
    mockedHooks.useCreateTask.mockReturnValue({
      mutateAsync: jest.fn(),
      isLoading: false,
    } as unknown as ReturnType<typeof hooks.useCreateTask>);
  });

  it('orders root tasks by sort order with sub-tasks under their parent', () => {
    expect(orderTasks(tasks).map((t) => t.id)).toEqual(['root-1', 'child-1', 'root-2', 'root-3']);
  });

  it('shows a skeleton while loading', () => {
    mockTasksQuery({ data: undefined, isLoading: true });
    renderWithTestingProviders(<CaseViewTasks caseId="case-1" />);
    expect(screen.getByTestId('cases-tasks-loading')).toBeInTheDocument();
  });

  it('shows an error with a retry link when loading fails', async () => {
    mockTasksQuery({ data: undefined, isError: true });
    renderWithTestingProviders(<CaseViewTasks caseId="case-1" />);

    await userEvent.click(within(screen.getByTestId('cases-tasks-error')).getByText('Try again'));
    expect(refetch).toHaveBeenCalled();
  });

  it('shows the empty prompt with actions for users who can update', () => {
    mockTasksQuery({ data: { tasks: [], comment_counts: {} } });
    renderWithTestingProviders(<CaseViewTasks caseId="case-1" />, {
      wrapperProps: { permissions: allCasesPermissions() },
    });

    const empty = screen.getByTestId('cases-tasks-empty');
    expect(within(empty).getByTestId('cases-tasks-add')).toBeInTheDocument();
    expect(within(empty).getByTestId('cases-tasks-apply-list')).toBeInTheDocument();
  });

  it('shows the empty prompt without actions for read-only users', () => {
    mockTasksQuery({ data: { tasks: [], comment_counts: {} } });
    renderWithTestingProviders(<CaseViewTasks caseId="case-1" />, {
      wrapperProps: { permissions: readCasesPermissions() },
    });

    expect(screen.getByTestId('cases-tasks-empty')).toBeInTheDocument();
    expect(screen.queryByTestId('cases-tasks-add')).not.toBeInTheDocument();
  });

  it('renders the count, rows, and completes a task from the checkbox', async () => {
    renderWithTestingProviders(<CaseViewTasks caseId="case-1" />, {
      wrapperProps: { permissions: allCasesPermissions() },
    });

    expect(screen.getByTestId('cases-tasks-count')).toHaveTextContent('Showing 4 tasks, 3 open');
    expect(screen.getByTestId('cases-task-row-child-1')).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('cases-task-done-root-1'));
    expect(updateTask).toHaveBeenCalledWith({
      taskId: 'root-1',
      request: { version: 'v1', status: 'completed' },
    });

    await userEvent.click(screen.getByTestId('cases-task-done-root-2'));
    expect(updateTask).toHaveBeenLastCalledWith({
      taskId: 'root-2',
      request: { version: 'v1', status: 'open' },
    });
  });

  it('leaves read-only users with the checkbox hidden and only Open task in the row menu', async () => {
    renderWithTestingProviders(<CaseViewTasks caseId="case-1" />, {
      wrapperProps: { permissions: readCasesPermissions() },
    });

    expect(screen.queryByTestId('cases-task-done-root-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('cases-tasks-add')).not.toBeInTheDocument();
    expect(screen.getByTestId('cases-task-comment-count-root-1')).toHaveTextContent('2');

    await userEvent.click(screen.getByTestId('cases-task-actions-root-1'));
    expect(screen.getByText('Open task')).toBeInTheDocument();
    expect(screen.queryByText('Edit task')).not.toBeInTheDocument();
  });

  it('opens the task detail flyout from the title', async () => {
    mockedHooks.useGetTaskComments.mockReturnValue({
      data: { comments: [], total: 0 },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof hooks.useGetTaskComments>);
    mockedHooks.useAddTaskComment.mockReturnValue({
      mutateAsync: jest.fn(),
      isLoading: false,
    } as unknown as ReturnType<typeof hooks.useAddTaskComment>);
    mockedHooks.useDeleteTaskComment.mockReturnValue({
      mutateAsync: jest.fn(),
      isLoading: false,
    } as unknown as ReturnType<typeof hooks.useDeleteTaskComment>);
    renderWithTestingProviders(<CaseViewTasks caseId="case-1" />, {
      wrapperProps: { permissions: readCasesPermissions() },
    });

    await userEvent.click(screen.getByTestId('cases-task-open-root-1'));
    const flyout = await screen.findByTestId('cases-task-detail-flyout');
    expect(within(flyout).getByText('Block sender')).toBeInTheDocument();
    expect(within(flyout).getByTestId('cases-task-comments-empty')).toBeInTheDocument();
    expect(within(flyout).queryByTestId('cases-task-comment-input')).not.toBeInTheDocument();
  });

  it('offers delete only to users with the delete privilege', async () => {
    const { unmount } = renderWithTestingProviders(<CaseViewTasks caseId="case-1" />, {
      wrapperProps: { permissions: noDeleteCasesPermissions() },
    });

    await userEvent.click(screen.getByTestId('cases-task-actions-root-1'));
    expect(screen.getByText('Edit task')).toBeInTheDocument();
    expect(screen.getByText('Add sub-task')).toBeInTheDocument();
    expect(screen.queryByTestId('cases-task-delete')).not.toBeInTheDocument();
    unmount();

    renderWithTestingProviders(<CaseViewTasks caseId="case-1" />, {
      wrapperProps: { permissions: allCasesPermissions() },
    });
    await userEvent.click(screen.getByTestId('cases-task-actions-child-1'));
    expect(screen.getByTestId('cases-task-delete')).toBeInTheDocument();
    // Sub-tasks cannot have their own sub-tasks.
    expect(screen.queryByText('Add sub-task')).not.toBeInTheDocument();
  });

  it('hides completed tasks when the filter is on, keeping sub-tasks of open parents', async () => {
    renderWithTestingProviders(<CaseViewTasks caseId="case-1" />, {
      wrapperProps: { permissions: allCasesPermissions() },
    });

    await userEvent.click(screen.getByTestId('cases-tasks-hide-completed'));
    expect(screen.queryByTestId('cases-task-row-root-2')).not.toBeInTheDocument();
    expect(screen.getByTestId('cases-task-row-root-1')).toBeInTheDocument();
    expect(screen.getByTestId('cases-task-row-child-1')).toBeInTheDocument();
    // The count reports the whole list, not the filtered view.
    expect(screen.getByTestId('cases-tasks-count')).toHaveTextContent('Showing 4 tasks, 3 open');
  });

  it('marks task lists already on the case as applied in the picker', async () => {
    mockedHooks.useGetTaskTemplates.mockReturnValue({
      data: {
        templates: [
          { id: 'tpl-applied', name: 'Phishing', tasks: [], tags: [] },
          { id: 'tpl-new', name: 'Containment', tasks: [], tags: [] },
        ],
        total: 2,
      },
      isLoading: false,
    } as unknown as ReturnType<typeof hooks.useGetTaskTemplates>);
    mockedHooks.useApplyTaskTemplate.mockReturnValue({
      mutateAsync: jest.fn(),
      isLoading: false,
    } as unknown as ReturnType<typeof hooks.useApplyTaskTemplate>);
    mockTasksQuery({
      data: { tasks: [task({ id: 'root-1', template_id: 'tpl-applied' })], comment_counts: {} },
    });
    renderWithTestingProviders(<CaseViewTasks caseId="case-1" />, {
      wrapperProps: { permissions: allCasesPermissions() },
    });

    await userEvent.click(screen.getByTestId('cases-tasks-apply-list'));
    const options = await screen.findByTestId('cases-task-list-options');
    expect(within(options).getByText('Already applied')).toBeInTheDocument();
    expect(within(options).getByRole('option', { name: /Phishing/ })).toHaveAttribute(
      'aria-disabled',
      'true'
    );
  });

  it('opens the add task flyout', async () => {
    renderWithTestingProviders(<CaseViewTasks caseId="case-1" />, {
      wrapperProps: { permissions: allCasesPermissions() },
    });

    await userEvent.click(screen.getByTestId('cases-tasks-add'));
    expect(await screen.findByTestId('cases-task-flyout')).toBeInTheDocument();
  });
});
