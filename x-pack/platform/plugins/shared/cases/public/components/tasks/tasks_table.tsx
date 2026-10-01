/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBadge,
  EuiBasicTable,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiScreenReaderOnly,
  EuiText,
  EuiTextColor,
  formatDate,
  useEuiTheme,
} from '@elastic/eui';
import { UserAvatar } from '@kbn/user-profile-components';
import type { CaseSeverity } from '../../../common/types/domain';
import type { CaseTask } from '../../../common/types/domain/task/v1';
import { useBulkGetUserProfiles } from '../../containers/user_profiles/use_bulk_get_user_profiles';
import { useUpdateTask } from '../../containers/use_case_tasks';
import { useCasesContext } from '../cases_context/use_cases_context';
import { SeverityHealth } from '../severity/config';
import { TaskRowActions } from './task_row_actions';
import * as i18n from './translations';

const MAX_AVATARS = 3;

export const isTaskFinished = (task: CaseTask) =>
  task.status === 'completed' || task.status === 'cancelled';

/** Root tasks in order, each followed by its sub-tasks. */
export const orderTasks = (tasks: CaseTask[]): CaseTask[] => {
  const bySortOrder = (a: CaseTask, b: CaseTask) => a.sort_order - b.sort_order;
  const roots = tasks.filter((t) => t.parent_task_id === null).sort(bySortOrder);
  return roots.flatMap((root) => [
    root,
    ...tasks.filter((t) => t.parent_task_id === root.id).sort(bySortOrder),
  ]);
};

const STATUS_BADGES: Partial<Record<CaseTask['status'], { label: string; color: string }>> = {
  in_progress: { label: i18n.STATUS_IN_PROGRESS, color: 'primary' },
  cancelled: { label: i18n.STATUS_CANCELLED, color: 'hollow' },
};

export interface TasksTableProps {
  caseId: string;
  tasks: CaseTask[];
  onEdit: (task: CaseTask) => void;
  onAddSubtask: (task: CaseTask) => void;
}

export const TasksTable: React.FC<TasksTableProps> = ({ caseId, tasks, onEdit, onAddSubtask }) => {
  const { euiTheme } = useEuiTheme();
  const { permissions } = useCasesContext();
  const { mutate: updateTask } = useUpdateTask(caseId);

  const uids = useMemo(
    () => [...new Set(tasks.flatMap((t) => t.assignees.map(({ uid }) => uid)))],
    [tasks]
  );
  const { data: profiles } = useBulkGetUserProfiles({ uids });

  const ordered = useMemo(() => orderTasks(tasks), [tasks]);
  const subtaskCounts = useMemo(
    () =>
      tasks.reduce<Record<string, number>>((counts, t) => {
        if (t.parent_task_id) counts[t.parent_task_id] = (counts[t.parent_task_id] ?? 0) + 1;
        return counts;
      }, {}),
    [tasks]
  );

  const columns: Array<EuiBasicTableColumn<CaseTask>> = [
    {
      name: i18n.COLUMN_DONE,
      field: 'status',
      width: '56px',
      align: 'center',
      render: (_: unknown, task: CaseTask) => {
        const done = task.status === 'completed';
        if (!permissions.update) {
          return (
            <EuiIcon
              type={done ? 'check' : 'minus'}
              color={done ? 'success' : 'subdued'}
              aria-hidden={true}
            />
          );
        }
        return (
          <EuiCheckbox
            id={`cases-task-done-${task.id}`}
            checked={done}
            aria-label={done ? i18n.REOPEN_ARIA(task.title) : i18n.MARK_DONE_ARIA(task.title)}
            onChange={() =>
              updateTask({
                taskId: task.id,
                request: { version: task.version, status: done ? 'open' : 'completed' },
              })
            }
            data-test-subj={`cases-task-done-${task.id}`}
          />
        );
      },
    },
    {
      name: i18n.COLUMN_TASK,
      field: 'title',
      render: (title: string, task: CaseTask) => {
        const badge = STATUS_BADGES[task.status];
        return (
          <EuiFlexGroup
            gutterSize="s"
            alignItems="flexStart"
            responsive={false}
            css={{ paddingLeft: task.parent_task_id ? euiTheme.size.l : 0 }}
          >
            {task.parent_task_id && (
              <EuiFlexItem grow={false} css={{ paddingTop: euiTheme.size.xxs }}>
                <EuiIcon type="branch" color="subdued" size="s" aria-hidden={true} />
              </EuiFlexItem>
            )}
            <EuiFlexItem>
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
                <EuiFlexItem grow={false}>
                  <EuiText
                    size="s"
                    css={isTaskFinished(task) ? { textDecoration: 'line-through' } : undefined}
                  >
                    {title}
                  </EuiText>
                </EuiFlexItem>
                {badge && (
                  <EuiFlexItem grow={false}>
                    <EuiBadge color={badge.color}>{badge.label}</EuiBadge>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
              {task.description && (
                <EuiText size="xs" color="subdued" css={{ marginTop: euiTheme.size.xxs }}>
                  {task.description}
                </EuiText>
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      },
    },
    {
      name: i18n.COLUMN_PRIORITY,
      field: 'priority',
      width: '110px',
      // Task priorities share the case severity scale, so the same health rendering applies.
      render: (priority: CaseTask['priority']) => (
        <SeverityHealth severity={priority as unknown as CaseSeverity} />
      ),
    },
    {
      name: i18n.COLUMN_ASSIGNEES,
      field: 'assignees',
      width: '120px',
      render: (assignees: CaseTask['assignees']) =>
        assignees.length === 0 ? null : (
          <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center">
            {assignees.slice(0, MAX_AVATARS).map(({ uid }) => {
              const profile = profiles?.get(uid);
              return (
                <EuiFlexItem grow={false} key={uid}>
                  <UserAvatar user={profile?.user} avatar={profile?.data.avatar} size="s" />
                </EuiFlexItem>
              );
            })}
            {assignees.length > MAX_AVATARS && (
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">{`+${assignees.length - MAX_AVATARS}`}</EuiText>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        ),
    },
    {
      name: i18n.COLUMN_DUE,
      field: 'due_date',
      width: '120px',
      render: (dueDate: string | null, task: CaseTask) => {
        if (!dueDate) return null;
        const overdue = !isTaskFinished(task) && new Date(dueDate) < new Date();
        return (
          <EuiTextColor color={overdue ? 'danger' : undefined}>
            {formatDate(dueDate, 'date')}
            {overdue && (
              <EuiScreenReaderOnly>
                <span>{` ${i18n.OVERDUE}`}</span>
              </EuiScreenReaderOnly>
            )}
          </EuiTextColor>
        );
      },
    },
    ...(permissions.update || permissions.delete
      ? [
          {
            name: (
              <EuiScreenReaderOnly>
                <span>{i18n.COLUMN_ACTIONS}</span>
              </EuiScreenReaderOnly>
            ),
            width: '48px',
            align: 'right',
            render: (task: CaseTask) => (
              <TaskRowActions
                caseId={caseId}
                task={task}
                subtaskCount={subtaskCounts[task.id] ?? 0}
                onEdit={onEdit}
                onAddSubtask={onAddSubtask}
              />
            ),
          } as EuiBasicTableColumn<CaseTask>,
        ]
      : []),
  ];

  return (
    <EuiBasicTable<CaseTask>
      tableCaption={i18n.COLUMN_TASK}
      items={ordered}
      columns={columns}
      rowProps={(task) => ({ 'data-test-subj': `cases-task-row-${task.id}` })}
      data-test-subj="cases-tasks-table"
    />
  );
};

TasksTable.displayName = 'TasksTable';
