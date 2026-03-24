/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiBasicTable,
  EuiEmptyPrompt,
  EuiSkeletonText,
  EuiBadge,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import type { CaseTask } from '../../../common/types/domain/task/v1';
import { useDeleteTask } from '../../containers/use_delete_task';
import { useUpdateTask } from '../../containers/use_update_task';
import * as i18n from './translations';

const STATUS_LABELS: Record<CaseTask['status'], string> = {
  open: i18n.STATUS_OPEN,
  in_progress: i18n.STATUS_IN_PROGRESS,
  completed: i18n.STATUS_COMPLETED,
  cancelled: i18n.STATUS_CANCELLED,
};

const STATUS_COLORS: Record<CaseTask['status'], string> = {
  open: 'default',
  in_progress: 'primary',
  completed: 'success',
  cancelled: 'default',
};

const PRIORITY_LABELS: Record<CaseTask['priority'], string> = {
  low: i18n.PRIORITY_LOW,
  medium: i18n.PRIORITY_MEDIUM,
  high: i18n.PRIORITY_HIGH,
  critical: i18n.PRIORITY_CRITICAL,
};

interface TasksTableProps {
  caseId: string;
  tasks: CaseTask[];
  isLoading: boolean;
  onAddTask?: () => void;
}

export const TasksTable = React.memo<TasksTableProps>(
  ({ caseId, tasks, isLoading, onAddTask }) => {
    const { mutate: deleteTask } = useDeleteTask(caseId);
    const { mutate: updateTask } = useUpdateTask(caseId);

    const handleStatusChange = useCallback(
      (task: CaseTask, newStatus: CaseTask['status']) => {
        updateTask({ taskId: task.id, request: { version: task.version, status: newStatus } });
      },
      [updateTask]
    );

    const handleDelete = useCallback(
      (taskId: string) => {
        deleteTask(taskId);
      },
      [deleteTask]
    );

    const columns: Array<EuiBasicTableColumn<CaseTask>> = [
      {
        name: i18n.TASK_TITLE,
        field: 'title',
        'data-test-subj': 'cases-tasks-table-title',
        truncateText: true,
      },
      {
        name: i18n.TASK_STATUS,
        field: 'status',
        'data-test-subj': 'cases-tasks-table-status',
        width: '120px',
        render: (status: CaseTask['status'], task: CaseTask) => (
          <EuiBadge
            color={STATUS_COLORS[status]}
            onClick={() => {
              const nextStatus = status === 'open' ? 'in_progress' : status === 'in_progress' ? 'completed' : 'open';
              handleStatusChange(task, nextStatus as CaseTask['status']);
            }}
            onClickAriaLabel={`Change status from ${status}`}
            data-test-subj={`cases-tasks-status-${status}`}
          >
            {STATUS_LABELS[status]}
          </EuiBadge>
        ),
      },
      {
        name: i18n.TASK_PRIORITY,
        field: 'priority',
        'data-test-subj': 'cases-tasks-table-priority',
        width: '100px',
        render: (priority: CaseTask['priority']) => PRIORITY_LABELS[priority],
      },
      {
        name: i18n.TASK_DUE_DATE,
        field: 'due_date',
        'data-test-subj': 'cases-tasks-table-due-date',
        width: '150px',
        render: (dueDate: string | null) =>
          dueDate ? new Date(dueDate).toLocaleDateString() : '—',
      },
      {
        name: i18n.TASK_ACTIONS,
        field: 'actions',
        'data-test-subj': 'cases-tasks-table-actions',
        width: '80px',
        actions: [
          {
            name: i18n.DELETE_TASK,
            render: (task: CaseTask) => (
              <EuiButtonIcon
                iconType="trash"
                aria-label={i18n.DELETE_TASK}
                color="danger"
                data-test-subj={`cases-tasks-delete-${task.id}`}
                onClick={() => handleDelete(task.id)}
              />
            ),
          },
        ],
      },
    ];

    if (isLoading) {
      return <EuiSkeletonText lines={5} />;
    }

    if (tasks.length === 0) {
      return (
        <EuiEmptyPrompt
          title={<h3>{i18n.NO_TASKS}</h3>}
          body={<p>{i18n.NO_TASKS_DESCRIPTION}</p>}
          data-test-subj="cases-tasks-table-empty"
          titleSize="xs"
          actions={
            onAddTask ? (
              <EuiButton
                size="s"
                onClick={onAddTask}
                iconType="plus"
                data-test-subj="cases-tasks-add-task-empty"
              >
                {i18n.ADD_TASK}
              </EuiButton>
            ) : null
          }
        />
      );
    }

    return (
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              {onAddTask && (
                <EuiButton
                  size="s"
                  onClick={onAddTask}
                  iconType="plus"
                  data-test-subj="cases-tasks-add-task"
                >
                  {i18n.ADD_TASK}
                </EuiButton>
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiBasicTable
            items={tasks}
            columns={columns}
            rowHeader="title"
            data-test-subj="cases-tasks-table"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

TasksTable.displayName = 'TasksTable';
