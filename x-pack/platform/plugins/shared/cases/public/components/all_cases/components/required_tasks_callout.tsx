/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { CaseTask } from '../../../../common/types/domain/task/v1';
import { useUpdateTask } from '../../../containers/use_case_tasks';

export const isOpenRequiredTask = (task: CaseTask) =>
  task.required && task.status !== 'completed' && task.status !== 'cancelled';

export const REQUIRED_TASKS_MISSING = (count: number) =>
  i18n.translate('xpack.cases.closeCaseModal.missingTooltip', {
    values: { count },
    defaultMessage:
      'To close the case: finish {count, plural, one {# required task} other {# required tasks}}',
  });

const TITLE = (count: number) =>
  i18n.translate('xpack.cases.closeCaseModal.requiredTasks.title', {
    values: { count },
    defaultMessage: '{count, plural, one {# required task is} other {# required tasks are}} open',
  });

const BODY = i18n.translate('xpack.cases.closeCaseModal.requiredTasks.body', {
  defaultMessage: 'These must be done before the case closes.',
});

const MARK_DONE = i18n.translate('xpack.cases.closeCaseModal.requiredTasks.markDone', {
  defaultMessage: 'Mark as done',
});

const MARK_DONE_ARIA = (title: string) =>
  i18n.translate('xpack.cases.closeCaseModal.requiredTasks.markDoneAria', {
    values: { title },
    defaultMessage: 'Mark {title} as done',
  });

const RUNS_WORKFLOW = i18n.translate('xpack.cases.closeCaseModal.requiredTasks.runsWorkflow', {
  defaultMessage: 'Completes when its workflow run succeeds',
});

/** Names the required tasks still open; each can be marked done in place. */
export const RequiredTasksCallout: React.FC<{
  caseId: string;
  tasks: CaseTask[];
  canUpdate: boolean;
}> = ({ caseId, tasks, canUpdate }) => {
  const { mutate: updateTask, isLoading } = useUpdateTask(caseId);
  if (tasks.length === 0) {
    return null;
  }
  return (
    <>
      <EuiCallOut
        announceOnMount
        color="warning"
        iconType="warning"
        size="s"
        title={TITLE(tasks.length)}
        data-test-subj="close-case-modal-required-tasks"
      >
        <EuiText size="s">
          <p>{BODY}</p>
        </EuiText>
        <EuiSpacer size="xs" />
        {tasks.map((task) => (
          <EuiFlexGroup key={task.id} gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem>
              <EuiText size="s">{task.title}</EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {task.workflow_run?.status === 'running' ? (
                <EuiText size="xs" color="subdued">
                  {RUNS_WORKFLOW}
                </EuiText>
              ) : canUpdate ? (
                <EuiButtonEmpty
                  size="xs"
                  isLoading={isLoading}
                  aria-label={MARK_DONE_ARIA(task.title)}
                  onClick={() =>
                    updateTask({
                      taskId: task.id,
                      request: { version: task.version, status: 'completed' },
                    })
                  }
                  data-test-subj={`close-case-modal-mark-done-${task.id}`}
                >
                  {MARK_DONE}
                </EuiButtonEmpty>
              ) : null}
            </EuiFlexItem>
          </EuiFlexGroup>
        ))}
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  );
};
