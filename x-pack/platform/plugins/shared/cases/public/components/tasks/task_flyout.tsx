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
  EuiSwitch,
  EuiSpacer,
  EuiTextArea,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { CaseTask, CaseTaskPriority } from '../../../common/types/domain/task/v1';
import type { taskApiV1 } from '../../../common/types/api';
import { MAX_TITLE_LENGTH } from '../../../common/constants';
import { useCasesContext } from '../cases_context/use_cases_context';
import { useCasesFeatures } from '../../common/use_cases_features';
import { useCreateTask, useUpdateTask } from '../../containers/use_case_tasks';
import { severities } from '../severity/config';
import { TaskAssigneesField } from './task_assignees_field';
import { DueWithinField, dueDateFromDraft, type DueWithinDraft } from './due_within_field';
import * as i18n from './translations';

const PRIORITY_OPTIONS = (Object.keys(severities) as CaseTaskPriority[]).map((value) => ({
  value,
  text: severities[value].label,
}));

interface TaskFormState {
  title: string;
  description: string;
  priority: CaseTaskPriority;
  dueWithin: DueWithinDraft;
  required: boolean;
  assignees: CaseTask['assignees'];
}

/** Expresses an existing deadline as the largest whole unit that still fits, so an edit round-trips. */
const dueWithinFromDate = (dueDate: string | null | undefined): DueWithinDraft => {
  const remainingMs = dueDate ? new Date(dueDate).getTime() - Date.now() : 0;
  if (remainingMs <= 0) return { value: '', unit: 'hours' };
  const minutes = Math.round(remainingMs / 60_000);
  if (minutes >= 1440 && minutes % 1440 === 0)
    return { value: String(minutes / 1440), unit: 'days' };
  if (minutes >= 60) return { value: String(Math.round(minutes / 60)), unit: 'hours' };
  return { value: String(minutes), unit: 'minutes' };
};

const fromTask = (task?: CaseTask): TaskFormState => ({
  title: task?.title ?? '',
  description: task?.description ?? '',
  priority: task?.priority ?? 'medium',
  dueWithin: dueWithinFromDate(task?.due_date),
  required: task?.required ?? false,
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

  const [initialForm] = useState<TaskFormState>(() => fromTask(task));
  const [form, setForm] = useState<TaskFormState>(initialForm);
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
      // Editing keeps the stored deadline unless the field was changed or cleared.
      due_date:
        task &&
        form.dueWithin.value === initialForm.dueWithin.value &&
        form.dueWithin.unit === initialForm.dueWithin.unit
          ? task.due_date
          : dueDateFromDraft(form.dueWithin),
      required: form.required,
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
  }, [
    canAssign,
    createTask,
    form,
    initialForm,
    isTitleInvalid,
    onClose,
    parentTask?.id,
    task,
    updateTask,
  ]);

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
          {canAssign && (
            <TaskAssigneesField
              value={form.assignees}
              onChange={(assignees) => setField('assignees', assignees)}
            />
          )}
          <EuiFormRow label={i18n.FIELD_PRIORITY} fullWidth>
            <EuiSelect
              fullWidth
              options={PRIORITY_OPTIONS}
              value={form.priority}
              onChange={(event) => setField('priority', event.target.value as CaseTaskPriority)}
              data-test-subj="cases-task-priority"
            />
          </EuiFormRow>
          <DueWithinField
            fullWidth
            helpText={i18n.DUE_WITHIN_HELP}
            value={form.dueWithin}
            onChange={(dueWithin) => setField('dueWithin', dueWithin)}
            dataTestSubj="cases-task-due-within"
          />
          <EuiFormRow label={i18n.REQUIRED} helpText={i18n.REQUIRED_HELP} fullWidth>
            <EuiSwitch
              label={i18n.REQUIRED}
              showLabel={false}
              checked={form.required}
              onChange={(event) => setField('required', event.target.checked)}
              data-test-subj="cases-task-required"
            />
          </EuiFormRow>
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
