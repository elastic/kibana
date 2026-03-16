/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiDatePicker,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
  EuiTextArea,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import moment from 'moment';
import type { CaseTask, CaseTaskPriority } from '../../../common/types/domain/task/v1';
import type { taskApiV1 } from '../../../common/types/api';
import { MAX_TITLE_LENGTH } from '../../../common/constants';
import { useCasesContext } from '../cases_context/use_cases_context';
import { useCasesFeatures } from '../../common/use_cases_features';
import { useCreateTask, useUpdateTask } from '../../containers/use_case_tasks';
import { severities } from '../severity/config';
import { TaskAssigneesField } from './task_assignees_field';
import * as i18n from './translations';

const PRIORITY_OPTIONS = (Object.keys(severities) as CaseTaskPriority[]).map((value) => ({
  value,
  text: severities[value].label,
}));

interface TaskFormState {
  title: string;
  description: string;
  priority: CaseTaskPriority;
  dueDate: moment.Moment | null;
  assignees: CaseTask['assignees'];
}

const fromTask = (task?: CaseTask): TaskFormState => ({
  title: task?.title ?? '',
  description: task?.description ?? '',
  priority: task?.priority ?? 'medium',
  dueDate: task?.due_date ? moment(task.due_date) : null,
  assignees: task?.assignees ?? [],
});

export interface TaskFlyoutProps {
  caseId: string;
  /** Present when editing. */
  task?: CaseTask;
  /** Present when adding a sub-task. */
  parentTask?: CaseTask;
  onClose: () => void;
}

export const TaskFlyout: React.FC<TaskFlyoutProps> = ({ caseId, task, parentTask, onClose }) => {
  const titleId = useGeneratedHtmlId();
  const { permissions } = useCasesContext();
  const { caseAssignmentAuthorized } = useCasesFeatures();
  const canAssign = permissions.assign && caseAssignmentAuthorized;
  const { mutateAsync: createTask, isLoading: isCreating } = useCreateTask(caseId);
  const { mutateAsync: updateTask, isLoading: isUpdating } = useUpdateTask(caseId);

  const [form, setForm] = useState<TaskFormState>(() => fromTask(task));
  const [showTitleError, setShowTitleError] = useState(false);
  const setField = <K extends keyof TaskFormState>(key: K, value: TaskFormState[K]) =>
    setForm((previous) => ({ ...previous, [key]: value }));

  const flyoutTitle = task ? i18n.EDIT_TASK : parentTask ? i18n.ADD_SUBTASK : i18n.ADD_TASK;
  const isTitleInvalid = form.title.trim().length === 0;

  const onSubmit = useCallback(async () => {
    if (isTitleInvalid) {
      setShowTitleError(true);
      return;
    }
    const fields = {
      title: form.title.trim(),
      description: form.description.trim(),
      priority: form.priority,
      due_date: form.dueDate?.toISOString() ?? null,
      ...(canAssign ? { assignees: form.assignees } : {}),
    };
    if (task) {
      await updateTask({
        taskId: task.id,
        request: { version: task.version, ...fields } as taskApiV1.TaskPatchRequest,
      });
    } else {
      await createTask({ ...fields, parent_task_id: parentTask?.id ?? null });
    }
    onClose();
  }, [canAssign, createTask, form, isTitleInvalid, onClose, parentTask?.id, task, updateTask]);

  return (
    <EuiFlyout
      ownFocus
      size="m"
      onClose={onClose}
      aria-labelledby={titleId}
      data-test-subj="cases-task-flyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={titleId}>{flyoutTitle}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {parentTask && (
          <>
            <EuiCallOut
              announceOnMount
              size="s"
              iconType="branch"
              title={i18n.SUBTASK_OF(parentTask.title)}
            />
            <EuiSpacer size="m" />
          </>
        )}
        <EuiForm component="form" onSubmit={(event) => event.preventDefault()}>
          <EuiFormRow
            label={i18n.FIELD_TITLE}
            isInvalid={showTitleError && isTitleInvalid}
            error={i18n.TITLE_REQUIRED}
            fullWidth
          >
            <EuiFieldText
              autoFocus
              fullWidth
              maxLength={MAX_TITLE_LENGTH}
              value={form.title}
              isInvalid={showTitleError && isTitleInvalid}
              onChange={(event) => setField('title', event.target.value)}
              data-test-subj="cases-task-title"
            />
          </EuiFormRow>
          <EuiFormRow label={i18n.FIELD_DESCRIPTION} fullWidth>
            <EuiTextArea
              fullWidth
              rows={3}
              value={form.description}
              onChange={(event) => setField('description', event.target.value)}
              data-test-subj="cases-task-description"
            />
          </EuiFormRow>
          <EuiFormRow label={i18n.FIELD_PRIORITY} fullWidth>
            <EuiSelect
              fullWidth
              options={PRIORITY_OPTIONS}
              value={form.priority}
              onChange={(event) => setField('priority', event.target.value as CaseTaskPriority)}
              data-test-subj="cases-task-priority"
            />
          </EuiFormRow>
          <EuiFormRow label={i18n.FIELD_DUE_DATE} fullWidth>
            <EuiDatePicker
              fullWidth
              selected={form.dueDate}
              onChange={(date) => setField('dueDate', date)}
              onClear={() => setField('dueDate', null)}
              data-test-subj="cases-task-due-date"
            />
          </EuiFormRow>
          {canAssign && (
            <TaskAssigneesField
              value={form.assignees}
              onChange={(assignees) => setField('assignees', assignees)}
            />
          )}
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty flush="left" onClick={onClose} data-test-subj="cases-task-cancel">
              {i18n.CANCEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              isLoading={isCreating || isUpdating}
              onClick={onSubmit}
              data-test-subj="cases-task-submit"
            >
              {task ? i18n.SAVE_TASK : flyoutTitle}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

TaskFlyout.displayName = 'TaskFlyout';
