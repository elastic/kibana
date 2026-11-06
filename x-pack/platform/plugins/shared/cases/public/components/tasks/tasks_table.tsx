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
  EuiButtonIcon,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiScreenReaderOnly,
  EuiText,
  EuiTextColor,
  EuiToolTip,
  formatDate,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedRelative } from '@kbn/i18n-react';
import { UserAvatar } from '@kbn/user-profile-components';
import type { CaseSeverity } from '../../../common/types/domain';
import type { CaseTask } from '../../../common/types/domain/task/v1';
import { useBulkGetUserProfiles } from '../../containers/user_profiles/use_bulk_get_user_profiles';
import {
  useGetTaskWorkflowOptions,
  useRunTaskWorkflow,
  useUpdateTask,
} from '../../containers/use_case_tasks';
import { useCanRunCaseWorkflow } from '../workflows/use_run_case_workflow';
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
  commentCounts: Record<string, number>;
  onOpen: (task: CaseTask) => void;
  onEdit: (task: CaseTask) => void;
  onAddSubtask: (task: CaseTask) => void;
}

export const TasksTable: React.FC<TasksTableProps> = ({
  caseId,
  tasks,
  commentCounts,
  onOpen,
  onEdit,
  onAddSubtask,
}) => {
  const { euiTheme } = useEuiTheme();
  const { permissions } = useCasesContext();
  const { mutate: updateTask } = useUpdateTask(caseId);
  const { mutate: runTaskWorkflow, isLoading: isStartingRun } = useRunTaskWorkflow(caseId);
  const canRunWorkflow = useCanRunCaseWorkflow();
  const hasWorkflowTasks = tasks.some((t) => t.workflow_id);
  const { data: workflowOptions } = useGetTaskWorkflowOptions({
    enabled: hasWorkflowTasks && canRunWorkflow,
  });
  const workflowNames = useMemo(
    () => new Map((workflowOptions ?? []).map(({ id, name }) => [id, name])),
    [workflowOptions]
  );

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
        const isRunning = task.workflow_run?.status === 'running';
        const checkbox = (
          <EuiCheckbox
            id={`cases-task-done-${task.id}`}
            checked={done}
            disabled={isRunning && !done}
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
        return isRunning && !done ? (
          <EuiToolTip content={i18n.DONE_WHILE_RUNNING_TOOLTIP}>{checkbox}</EuiToolTip>
        ) : (
          checkbox
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
                    <EuiLink
                      color="text"
                      onClick={() => onOpen(task)}
                      data-test-subj={`cases-task-open-${task.id}`}
                    >
                      {title}
                    </EuiLink>
                  </EuiText>
                </EuiFlexItem>
                {badge && (
                  <EuiFlexItem grow={false}>
                    <EuiBadge color={badge.color}>{badge.label}</EuiBadge>
                  </EuiFlexItem>
                )}
                {task.required && (
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="warning" data-test-subj={`cases-task-required-${task.id}`}>
                      {i18n.REQUIRED}
                    </EuiBadge>
                  </EuiFlexItem>
                )}
                {task.workflow_id && (
                  <EuiFlexItem grow={false}>
                    <EuiToolTip content={i18n.WORKFLOW_BADGE_TOOLTIP}>
                      <EuiBadge
                        color="hollow"
                        iconType="workflow"
                        tabIndex={0}
                        data-test-subj={`cases-task-workflow-${task.id}`}
                      >
                        {workflowNames.get(task.workflow_id) ?? i18n.WORKFLOW_UNKNOWN}
                      </EuiBadge>
                    </EuiToolTip>
                  </EuiFlexItem>
                )}
                {task.workflow_run?.status === 'running' && (
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="primary" data-test-subj={`cases-task-workflow-status-${task.id}`}>
                      {i18n.WORKFLOW_RUNNING}
                    </EuiBadge>
                  </EuiFlexItem>
                )}
                {task.workflow_run?.status === 'failed' && !isTaskFinished(task) && (
                  <EuiFlexItem grow={false}>
                    <EuiToolTip
                      content={i18n.WORKFLOW_FAILED_TOOLTIP(task.workflow_run.error ?? '')}
                    >
                      <EuiBadge
                        color="danger"
                        tabIndex={0}
                        data-test-subj={`cases-task-workflow-status-${task.id}`}
                      >
                        {i18n.WORKFLOW_FAILED}
                      </EuiBadge>
                    </EuiToolTip>
                  </EuiFlexItem>
                )}
                {task.workflow_id &&
                  canRunWorkflow &&
                  !isTaskFinished(task) &&
                  task.workflow_run?.status !== 'running' && (
                    <EuiFlexItem grow={false}>
                      <EuiToolTip content={i18n.RUN_WORKFLOW} disableScreenReaderOutput>
                        <EuiButtonIcon
                          iconType="play"
                          size="xs"
                          isDisabled={isStartingRun}
                          aria-label={i18n.RUN_WORKFLOW_ARIA(task.title)}
                          onClick={() => runTaskWorkflow(task.id)}
                          data-test-subj={`cases-task-run-workflow-${task.id}`}
                        />
                      </EuiToolTip>
                    </EuiFlexItem>
                  )}
                {(commentCounts[task.id] ?? 0) > 0 && (
                  <EuiFlexItem grow={false}>
                    <EuiText
                      size="xs"
                      color="subdued"
                      aria-label={i18n.COMMENT_COUNT_ARIA(commentCounts[task.id])}
                      data-test-subj={`cases-task-comment-count-${task.id}`}
                    >
                      <EuiIcon type="editorComment" size="s" aria-hidden={true} />{' '}
                      {commentCounts[task.id]}
                    </EuiText>
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
          <EuiToolTip content={formatDate(dueDate, 'dateTime')}>
            <EuiTextColor color={overdue ? 'danger' : undefined}>
              <FormattedRelative value={dueDate} />
              {overdue && (
                <EuiScreenReaderOnly>
                  <span>{` ${i18n.OVERDUE}`}</span>
                </EuiScreenReaderOnly>
              )}
            </EuiTextColor>
          </EuiToolTip>
        );
      },
    },
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
          onOpen={onOpen}
          onEdit={onEdit}
          onAddSubtask={onAddSubtask}
        />
      ),
    } as EuiBasicTableColumn<CaseTask>,
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
