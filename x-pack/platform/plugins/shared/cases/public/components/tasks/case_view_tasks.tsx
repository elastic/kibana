/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import type { CaseTask } from '../../../common/types/domain/task/v1';
import { useCasesContext } from '../cases_context/use_cases_context';
import { useGetCaseTasks } from '../../containers/use_case_tasks';
import { SidebarToggleButton } from '../case_view/components/sidebar/sidebar_toggle_button';
import { ApplyTaskListModal } from './apply_task_list_modal';
import { TaskDetailFlyout } from './task_detail_flyout';
import { TaskFlyout } from './task_flyout';
import { isTaskFinished, TasksTable } from './tasks_table';
import * as i18n from './translations';

type Dialog =
  | { kind: 'add'; parentTask?: CaseTask }
  | { kind: 'edit'; task: CaseTask }
  | { kind: 'detail'; task: CaseTask }
  | { kind: 'apply' }
  | null;

export interface CaseViewTasksProps {
  caseId: string;
}

export const CaseViewTasks: React.FC<CaseViewTasksProps> = ({ caseId }) => {
  const { permissions } = useCasesContext();
  const { data, isLoading, isError, refetch } = useGetCaseTasks(caseId);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [hideCompleted, setHideCompleted] = useState(false);
  const closeDialog = () => setDialog(null);

  const tasks = useMemo(() => data?.tasks ?? [], [data?.tasks]);
  const openCount = tasks.filter((task) => !isTaskFinished(task)).length;
  // A sub-task stays visible while its parent is open so the hierarchy keeps its shape.
  const visibleTasks = useMemo(() => {
    if (!hideCompleted) return tasks;
    const openIds = new Set(tasks.filter((task) => !isTaskFinished(task)).map(({ id }) => id));
    return tasks.filter(
      (task) => openIds.has(task.id) || (task.parent_task_id && openIds.has(task.parent_task_id))
    );
  }, [hideCompleted, tasks]);

  const actions = permissions.update
    ? [
        <EuiButtonEmpty
          key="apply"
          iconType="documents"
          onClick={() => setDialog({ kind: 'apply' })}
          data-test-subj="cases-tasks-apply-list"
        >
          {i18n.APPLY_TASK_LIST}
        </EuiButtonEmpty>,
        <EuiButton
          key="add"
          fill
          iconType="plusCircle"
          onClick={() => setDialog({ kind: 'add' })}
          data-test-subj="cases-tasks-add"
        >
          {i18n.ADD_TASK}
        </EuiButton>,
      ]
    : [];

  let content: React.ReactNode;
  if (isLoading) {
    content = <EuiSkeletonText lines={6} data-test-subj="cases-tasks-loading" />;
  } else if (isError) {
    content = (
      <EuiCallOut
        announceOnMount
        color="danger"
        title={i18n.LOAD_ERROR_TITLE}
        data-test-subj="cases-tasks-error"
      >
        <EuiLink onClick={() => refetch()}>{i18n.TRY_AGAIN}</EuiLink>
      </EuiCallOut>
    );
  } else if (tasks.length === 0) {
    content = (
      <EuiEmptyPrompt
        titleSize="xs"
        title={<h3>{i18n.NO_TASKS_TITLE}</h3>}
        body={<p>{i18n.NO_TASKS_BODY}</p>}
        actions={actions}
        data-test-subj="cases-tasks-empty"
      />
    );
  } else {
    content = (
      <>
        <EuiText size="xs" color="subdued" data-test-subj="cases-tasks-count">
          {i18n.SHOWING_TASKS(tasks.length, openCount)}
        </EuiText>
        <EuiSpacer size="s" />
        <TasksTable
          caseId={caseId}
          tasks={visibleTasks}
          commentCounts={data?.comment_counts ?? {}}
          onOpen={(task) => setDialog({ kind: 'detail', task })}
          onEdit={(task) => setDialog({ kind: 'edit', task })}
          onAddSubtask={(parentTask) => setDialog({ kind: 'add', parentTask })}
        />
      </>
    );
  }

  return (
    <EuiFlexItem grow={false} data-test-subj="case-view-tasks">
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiFilterGroup compressed={false}>
            <EuiFilterButton
              hasActiveFilters={hideCompleted}
              onClick={() => setHideCompleted((value) => !value)}
              isToggle
              isSelected={hideCompleted}
              data-test-subj="cases-tasks-hide-completed"
            >
              {i18n.HIDE_COMPLETED}
            </EuiFilterButton>
          </EuiFilterGroup>
        </EuiFlexItem>
        <EuiFlexItem />
        {actions.map((action) => (
          <EuiFlexItem grow={false} key={action.key}>
            {action}
          </EuiFlexItem>
        ))}
        <EuiFlexItem grow={false}>
          <SidebarToggleButton />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiPanel hasBorder paddingSize="m" hasShadow={false}>
        {content}
      </EuiPanel>
      {dialog?.kind === 'add' && (
        <TaskFlyout caseId={caseId} parentTask={dialog.parentTask} onClose={closeDialog} />
      )}
      {dialog?.kind === 'edit' && (
        <TaskFlyout caseId={caseId} task={dialog.task} onClose={closeDialog} />
      )}
      {dialog?.kind === 'detail' && (
        <TaskDetailFlyout
          caseId={caseId}
          // The row's task may be stale after an edit; prefer the fresh copy from the list.
          task={tasks.find(({ id }) => id === dialog.task.id) ?? dialog.task}
          onEdit={(task) => setDialog({ kind: 'edit', task })}
          onClose={closeDialog}
        />
      )}
      {dialog?.kind === 'apply' && (
        <ApplyTaskListModal
          caseId={caseId}
          appliedTemplateIds={[
            ...new Set(tasks.flatMap((t) => (t.template_id ? [t.template_id] : []))),
          ]}
          onClose={closeDialog}
        />
      )}
    </EuiFlexItem>
  );
};

CaseViewTasks.displayName = 'CaseViewTasks';
