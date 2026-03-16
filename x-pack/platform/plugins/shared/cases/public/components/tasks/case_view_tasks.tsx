/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import type { CaseTask } from '../../../common/types/domain/task/v1';
import { useCasesContext } from '../cases_context/use_cases_context';
import { useGetCaseTasks } from '../../containers/use_case_tasks';
import { ApplyTaskListModal } from './apply_task_list_modal';
import { TaskFlyout } from './task_flyout';
import { isTaskFinished, TasksTable } from './tasks_table';
import * as i18n from './translations';

type Dialog =
  | { kind: 'add'; parentTask?: CaseTask }
  | { kind: 'edit'; task: CaseTask }
  | { kind: 'apply' }
  | null;

export interface CaseViewTasksProps {
  caseId: string;
}

export const CaseViewTasks: React.FC<CaseViewTasksProps> = ({ caseId }) => {
  const { permissions } = useCasesContext();
  const { data, isLoading, isError, refetch } = useGetCaseTasks(caseId);
  const [dialog, setDialog] = useState<Dialog>(null);
  const closeDialog = () => setDialog(null);

  const tasks = data?.tasks ?? [];
  const openCount = tasks.filter((task) => !isTaskFinished(task)).length;

  const actions = permissions.update
    ? [
        <EuiButtonEmpty
          key="apply"
          size="s"
          iconType="documents"
          onClick={() => setDialog({ kind: 'apply' })}
          data-test-subj="cases-tasks-apply-list"
        >
          {i18n.APPLY_TASK_LIST}
        </EuiButtonEmpty>,
        <EuiButton
          key="add"
          size="s"
          iconType="plusInCircle"
          onClick={() => setDialog({ kind: 'add' })}
          data-test-subj="cases-tasks-add"
        >
          {i18n.ADD_TASK}
        </EuiButton>,
      ]
    : [];

  let content: React.ReactNode;
  if (isLoading) {
    content = <EuiSkeletonText lines={3} data-test-subj="cases-tasks-loading" />;
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
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem>
            <EuiText size="xs" color="subdued" data-test-subj="cases-tasks-count">
              {i18n.SHOWING_TASKS(tasks.length, openCount)}
            </EuiText>
          </EuiFlexItem>
          {actions.map((action) => (
            <EuiFlexItem grow={false} key={action.key}>
              {action}
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <TasksTable
          caseId={caseId}
          tasks={tasks}
          onEdit={(task) => setDialog({ kind: 'edit', task })}
          onAddSubtask={(parentTask) => setDialog({ kind: 'add', parentTask })}
        />
      </>
    );
  }

  return (
    <div data-test-subj="case-view-tasks">
      {content}
      {dialog?.kind === 'add' && (
        <TaskFlyout caseId={caseId} parentTask={dialog.parentTask} onClose={closeDialog} />
      )}
      {dialog?.kind === 'edit' && (
        <TaskFlyout caseId={caseId} task={dialog.task} onClose={closeDialog} />
      )}
      {dialog?.kind === 'apply' && <ApplyTaskListModal caseId={caseId} onClose={closeDialog} />}
    </div>
  );
};

CaseViewTasks.displayName = 'CaseViewTasks';
