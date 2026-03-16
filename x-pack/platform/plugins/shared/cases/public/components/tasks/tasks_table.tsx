/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiAvatar,
  EuiBasicTable,
  EuiBadge,
  EuiButton,
  EuiButtonIcon,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSkeletonText,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { getUserDisplayName } from '@kbn/user-profile-components';
import type { CaseTask } from '../../../common/types/domain/task/v1';
import { useDeleteTask } from '../../containers/use_delete_task';
import { useUpdateTask } from '../../containers/use_update_task';
import { useBulkGetUserProfiles } from '../../containers/user_profiles/use_bulk_get_user_profiles';
import * as i18n from './translations';

// ---------------------------------------------------------------------------
// Tree building
// ---------------------------------------------------------------------------

interface TaskRow extends CaseTask {
  _depth: number;
  _hasChildren: boolean;
}

const buildFlatTree = (tasks: CaseTask[], expandedIds: Set<string>): TaskRow[] => {
  const childrenMap = new Map<string | null, CaseTask[]>();
  for (const task of tasks) {
    const pid = task.parent_task_id ?? null;
    if (!childrenMap.has(pid)) childrenMap.set(pid, []);
    childrenMap.get(pid)!.push(task);
  }

  const result: TaskRow[] = [];

  const visit = (parentId: string | null, depth: number) => {
    const children = childrenMap.get(parentId) ?? [];
    for (const task of children) {
      const taskChildren = childrenMap.get(task.id) ?? [];
      const hasChildren = taskChildren.length > 0;
      result.push({ ...task, _depth: depth, _hasChildren: hasChildren });
      if (hasChildren && expandedIds.has(task.id)) {
        visit(task.id, depth + 1);
      }
    }
  };

  visit(null, 0);
  return result;
};

// ---------------------------------------------------------------------------
// Status display
// ---------------------------------------------------------------------------

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

const NEXT_STATUS: Record<CaseTask['status'], CaseTask['status']> = {
  open: 'in_progress',
  in_progress: 'completed',
  completed: 'open',
  cancelled: 'open',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface TasksTableProps {
  caseId: string;
  tasks: CaseTask[];
  isLoading: boolean;
  onAddTask?: () => void;
  onEditTask?: (task: CaseTask) => void;
  onAddSubTask?: (parentTask: CaseTask) => void;
}

export const TasksTable = React.memo<TasksTableProps>(
  ({ caseId, tasks, isLoading, onAddTask, onEditTask, onAddSubTask }) => {
    const { mutate: deleteTask } = useDeleteTask(caseId);
    const { mutate: updateTask } = useUpdateTask(caseId);

    const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
      // Expand all parent tasks by default
      const parentIds = new Set(tasks.map((t) => t.parent_task_id).filter(Boolean) as string[]);
      return parentIds;
    });

    const toggleExpand = useCallback((taskId: string) => {
      setExpandedIds((prev) => {
        const next = new Set(prev);
        if (next.has(taskId)) next.delete(taskId);
        else next.add(taskId);
        return next;
      });
    }, []);

    const flatRows = useMemo(() => buildFlatTree(tasks, expandedIds), [tasks, expandedIds]);

    // Collect all unique assignee uids across all tasks
    const allAssigneeUids = useMemo(
      () => [...new Set(tasks.flatMap((t) => (t.assignees ?? []).map((a) => a.uid)))],
      [tasks]
    );

    const { data: profileMap = new Map() } = useBulkGetUserProfiles({ uids: allAssigneeUids });

    const handleStatusCycle = useCallback(
      (task: CaseTask) => {
        updateTask({
          taskId: task.id,
          request: { version: task.version, status: NEXT_STATUS[task.status] },
        });
      },
      [updateTask]
    );

    const columns: Array<EuiBasicTableColumn<TaskRow>> = [
      {
        name: i18n.TASK_TITLE,
        field: 'title',
        'data-test-subj': 'cases-tasks-col-title',
        render: (title: string, row: TaskRow) => (
          <EuiFlexGroup
            alignItems="center"
            gutterSize="xs"
            responsive={false}
            style={{ paddingLeft: row._depth * 20 }}
          >
            {row._hasChildren ? (
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  iconType={expandedIds.has(row.id) ? 'arrowDown' : 'arrowRight'}
                  aria-label={expandedIds.has(row.id) ? i18n.COLLAPSE_SUBTASKS : i18n.EXPAND_SUBTASKS}
                  size="xs"
                  onClick={() => toggleExpand(row.id)}
                  data-test-subj={`cases-tasks-expand-${row.id}`}
                />
              </EuiFlexItem>
            ) : (
              <EuiFlexItem grow={false} style={{ width: 24 }} />
            )}
            <EuiFlexItem>
              <EuiText size="s">
                {row._depth > 0 && (
                  <span style={{ color: '#6a717d', marginRight: 4 }}>↳</span>
                )}
                {title}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      },
      {
        name: i18n.TASK_STATUS,
        field: 'status',
        width: '130px',
        'data-test-subj': 'cases-tasks-col-status',
        render: (status: CaseTask['status'], row: TaskRow) => (
          <EuiToolTip content={i18n.CLICK_TO_ADVANCE_STATUS}>
            <EuiBadge
              color={STATUS_COLORS[status]}
              onClick={() => handleStatusCycle(row)}
              onClickAriaLabel={i18n.CLICK_TO_ADVANCE_STATUS}
              data-test-subj={`cases-tasks-status-${row.id}`}
            >
              {STATUS_LABELS[status]}
            </EuiBadge>
          </EuiToolTip>
        ),
      },
      {
        name: i18n.TASK_ASSIGNEES,
        field: 'assignees',
        width: '100px',
        'data-test-subj': 'cases-tasks-col-assignees',
        render: (assignees: CaseTask['assignees']) => {
          if (!assignees || assignees.length === 0) return null;
          const visible = assignees.slice(0, 3);
          return (
            <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center">
              {visible.map(({ uid }) => {
                const profile = profileMap.get(uid);
                const displayName = profile ? getUserDisplayName(profile.user) : uid;
                return (
                  <EuiFlexItem key={uid} grow={false}>
                    <EuiToolTip content={displayName}>
                      <EuiAvatar
                        size="s"
                        name={displayName}
                        imageUrl={profile?.data?.avatar?.imageUrl}
                        data-test-subj={`cases-tasks-assignee-${uid}`}
                      />
                    </EuiToolTip>
                  </EuiFlexItem>
                );
              })}
              {assignees.length > 3 && (
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">+{assignees.length - 3}</EuiText>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          );
        },
      },
      {
        name: i18n.TASK_DUE_DATE,
        field: 'due_date',
        width: '110px',
        'data-test-subj': 'cases-tasks-col-due-date',
        render: (dueDate: string | null) =>
          dueDate ? new Date(dueDate).toLocaleDateString() : '—',
      },
      {
        name: i18n.TASK_ACTIONS,
        field: 'id',
        width: '100px',
        'data-test-subj': 'cases-tasks-col-actions',
        actions: [
          {
            name: i18n.EDIT_TASK,
            render: (row: TaskRow) => (
              <EuiButtonIcon
                iconType="pencil"
                aria-label={i18n.EDIT_TASK}
                data-test-subj={`cases-tasks-edit-${row.id}`}
                onClick={() => onEditTask?.(row)}
              />
            ),
          },
          {
            name: i18n.ADD_SUBTASK,
            render: (row: TaskRow) => (
              <EuiButtonIcon
                iconType="branch"
                aria-label={i18n.ADD_SUBTASK}
                data-test-subj={`cases-tasks-add-subtask-${row.id}`}
                onClick={() => {
                  // Ensure the parent is expanded so the new child becomes visible
                  setExpandedIds((prev) => new Set([...prev, row.id]));
                  onAddSubTask?.(row);
                }}
              />
            ),
          },
          {
            name: i18n.DELETE_TASK,
            render: (row: TaskRow) => (
              <EuiButtonIcon
                iconType="trash"
                aria-label={i18n.DELETE_TASK}
                color="danger"
                data-test-subj={`cases-tasks-delete-${row.id}`}
                onClick={() => deleteTask(row.id)}
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
          titleSize="xs"
          data-test-subj="cases-tasks-table-empty"
          actions={
            onAddTask ? (
              <EuiButton size="s" onClick={onAddTask} iconType="plus" data-test-subj="cases-tasks-add-task-empty">
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
                <EuiButton size="s" onClick={onAddTask} iconType="plus" data-test-subj="cases-tasks-add-task">
                  {i18n.ADD_TASK}
                </EuiButton>
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiBasicTable<TaskRow>
            items={flatRows}
            columns={columns}
            rowHeader="title"
            itemId="id"
            data-test-subj="cases-tasks-table"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

TasksTable.displayName = 'TasksTable';
