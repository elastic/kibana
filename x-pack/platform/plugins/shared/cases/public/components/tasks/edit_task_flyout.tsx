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
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiTitle,
} from '@elastic/eui';
import moment from 'moment';
import type { CaseTask } from '../../../common/types/domain/task/v1';
import { useUpdateTask } from '../../containers/use_update_task';
import { TaskFormFields } from './task_form_fields';
import type { TaskFormState } from './task_form_fields';
import * as i18n from './translations';

interface EditTaskFlyoutProps {
  caseId: string;
  task: CaseTask;
  onClose: () => void;
}

const taskToFormState = (task: CaseTask): TaskFormState => ({
  title: task.title,
  description: task.description ?? '',
  status: task.status,
  priority: task.priority,
  dueDate: task.due_date ? moment(task.due_date) : null,
  assignees: task.assignees ?? [],
  completionNotes: task.completion_notes ?? '',
});

export const EditTaskFlyout: React.FC<EditTaskFlyoutProps> = ({ caseId, task, onClose }) => {
  const { mutate: updateTask, isLoading } = useUpdateTask(caseId);
  const [form, setForm] = useState<TaskFormState>(() => taskToFormState(task));
  const [titleError, setTitleError] = useState<string | null>(null);

  const handleChange = useCallback((updates: Partial<TaskFormState>) => {
    setForm((prev) => ({ ...prev, ...updates }));
    if (updates.title !== undefined && updates.title.trim()) setTitleError(null);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!form.title.trim()) {
      setTitleError(i18n.TASK_TITLE_REQUIRED);
      return;
    }

    updateTask(
      {
        taskId: task.id,
        request: {
          version: task.version,
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          status: form.status,
          priority: form.priority,
          assignees: form.assignees,
          due_date: form.dueDate ? form.dueDate.toISOString() : null,
          completion_notes: form.completionNotes.trim() || null,
        },
      },
      { onSuccess: onClose }
    );
  }, [form, task, updateTask, onClose]);

  return (
    <EuiFlyout
      ownFocus
      onClose={onClose}
      aria-labelledby="cases-edit-task-flyout-title"
      data-test-subj="cases-edit-task-flyout"
      size="s"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="cases-edit-task-flyout-title" data-test-subj="cases-edit-task-flyout-title">
            {i18n.EDIT_TASK}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiForm component="form" data-test-subj="cases-edit-task-form">
          <TaskFormFields value={form} onChange={handleChange} titleError={titleError} />
        </EuiForm>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} flush="left" data-test-subj="cases-edit-task-flyout-cancel">
              {i18n.CANCEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={handleSubmit}
              fill
              isLoading={isLoading}
              data-test-subj="cases-edit-task-flyout-submit"
            >
              {i18n.SAVE_CHANGES}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
