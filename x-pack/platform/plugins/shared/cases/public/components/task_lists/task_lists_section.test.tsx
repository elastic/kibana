/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CaseTaskTemplate } from '../../../common/types/domain/task_template/v1';
import {
  allCasesPermissions,
  noCasesSettingsPermission,
  renderWithTestingProviders,
} from '../../common/mock';
import * as hooks from '../../containers/use_case_tasks';
import { TaskListsSection } from './task_lists_section';

jest.mock('../../containers/use_case_tasks');

const mockedHooks = hooks as jest.Mocked<typeof hooks>;

const template: CaseTaskTemplate = {
  id: 'tpl-1',
  version: 'v1',
  name: 'Phishing',
  description: 'Standard phishing response',
  tags: ['sop'],
  owner: 'securitySolution',
  created_at: '2024-01-01T00:00:00.000Z',
  created_by: { username: 'elastic', full_name: null, email: null, profile_uid: 'u1' },
  updated_at: null,
  updated_by: null,
  tasks: [
    {
      title: 'Block sender',
      description: '',
      priority: 'high',
      relative_due_days: 1,
      subtasks: [
        { title: 'Update blocklist', description: '', priority: 'medium', relative_due_days: null },
      ],
    },
  ],
};

describe('TaskListsSection', () => {
  const deleteTaskTemplate = jest.fn();
  const createTaskTemplate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockedHooks.useGetTaskTemplates.mockReturnValue({
      data: { templates: [template], total: 1 },
      isLoading: false,
    } as unknown as ReturnType<typeof hooks.useGetTaskTemplates>);
    mockedHooks.useDeleteTaskTemplate.mockReturnValue({
      mutateAsync: deleteTaskTemplate,
    } as unknown as ReturnType<typeof hooks.useDeleteTaskTemplate>);
    mockedHooks.useCreateTaskTemplate.mockReturnValue({
      mutateAsync: createTaskTemplate,
      isLoading: false,
    } as unknown as ReturnType<typeof hooks.useCreateTaskTemplate>);
    mockedHooks.useUpdateTaskTemplate.mockReturnValue({
      mutateAsync: jest.fn(),
      isLoading: false,
    } as unknown as ReturnType<typeof hooks.useUpdateTaskTemplate>);
  });

  it('lists task lists with their task count and tags', () => {
    renderWithTestingProviders(<TaskListsSection />, {
      wrapperProps: { permissions: allCasesPermissions() },
    });

    const row = screen.getByTestId('cases-task-list-row-tpl-1');
    expect(row).toHaveTextContent('Phishing');
    expect(row).toHaveTextContent('2 tasks');
    expect(row).toHaveTextContent('sop');
  });

  it('hides edit, delete, and add without the settings privilege', () => {
    renderWithTestingProviders(<TaskListsSection />, {
      wrapperProps: { permissions: noCasesSettingsPermission() },
    });

    expect(screen.queryByTestId('cases-task-list-edit-tpl-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('cases-task-list-delete-tpl-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('cases-task-lists-add')).not.toBeInTheDocument();
  });

  it('confirms before deleting', async () => {
    renderWithTestingProviders(<TaskListsSection />, {
      wrapperProps: { permissions: allCasesPermissions() },
    });

    await userEvent.click(screen.getByTestId('cases-task-list-delete-tpl-1'));
    expect(screen.getByText('Delete task list "Phishing"?')).toBeInTheDocument();
    await userEvent.click(screen.getByTestId('confirmModalConfirmButton'));
    expect(deleteTaskTemplate).toHaveBeenCalledWith('tpl-1');
  });

  it('requires a name and one titled task before saving a new list', async () => {
    renderWithTestingProviders(<TaskListsSection />, {
      wrapperProps: { permissions: allCasesPermissions() },
    });

    await userEvent.click(screen.getByTestId('cases-task-lists-add'));
    await userEvent.click(screen.getByTestId('cases-task-list-submit'));
    expect(screen.getByText('Name is required.')).toBeInTheDocument();
    expect(createTaskTemplate).not.toHaveBeenCalled();

    await userEvent.type(screen.getByTestId('cases-task-list-name'), 'Containment');
    await userEvent.type(screen.getByTestId('cases-task-list-task-0-title'), 'Isolate host');
    await userEvent.click(screen.getByTestId('cases-task-list-task-0-add-subtask'));
    await userEvent.type(
      screen.getByTestId('cases-task-list-task-0-subtask-0-title'),
      'Confirm isolation'
    );
    await userEvent.click(screen.getByTestId('cases-task-list-submit'));

    expect(createTaskTemplate).toHaveBeenCalledWith({
      name: 'Containment',
      description: '',
      tags: [],
      owner: 'securitySolution',
      tasks: [
        {
          title: 'Isolate host',
          description: '',
          priority: 'medium',
          relative_due_days: null,
          subtasks: [
            {
              title: 'Confirm isolation',
              description: '',
              priority: 'medium',
              relative_due_days: null,
            },
          ],
        },
      ],
    });
  });
});
