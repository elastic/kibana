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
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import type { CreateTaskRequest } from '../../containers/api';
import { useCreateTask } from '../../containers/use_create_task';
import { useCasesContext } from '../cases_context/use_cases_context';
import { TaskFormFields } from './task_form_fields';
import type { TaskFormState } from './task_form_fields';
import * as i18n from './translations';

interface AddTaskFlyoutProps {
  caseId: string;
  parentTaskId?: string | null;
  parentTaskTitle?: string;
  onClose: () => void;
}

const DEFAULT_FORM: TaskFormState = {
  title: '',
  description: '',
  status: 'open',
  priority: 'medium',
  dueDate: null,
  assignees: [],
  completionNotes: '',
};

export const AddTaskFlyout: React.FC<AddTaskFlyoutProps> = ({
  caseId,
  parentTaskId,
  parentTaskTitle,
  onClose,
}) => {
  const { mutate: createTask, isLoading } = useCreateTask(caseId);
  const { owner } = useCasesContext();

  const [form, setForm] = useState<TaskFormState>(DEFAULT_FORM);
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

    const request: CreateTaskRequest = {
      title: form.title.trim(),
      ...(form.description.trim() && { description: form.description.trim() }),
      status: form.status,
      priority: form.priority,
      assignees: form.assignees.length > 0 ? form.assignees : undefined,
      ...(form.dueDate && { due_date: form.dueDate.toISOString() }),
      ...(form.completionNotes.trim() && { completion_notes: form.completionNotes.trim() }),
      ...(parentTaskId != null && { parent_task_id: parentTaskId }),
      owner: owner[0],
    };

    createTask(request, { onSuccess: onClose });
  }, [form, parentTaskId, owner, createTask, onClose]);

  const flyoutTitle = parentTaskId ? i18n.ADD_SUBTASK : i18n.ADD_TASK;

  return (
    <EuiFlyout
      ownFocus
      onClose={onClose}
      aria-labelledby="cases-add-task-flyout-title"
      data-test-subj="cases-add-task-flyout"
      size="s"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="cases-add-task-flyout-title" data-test-subj="cases-add-task-flyout-title">
            {flyoutTitle}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {parentTaskTitle && (
          <>
            <EuiCallOut
              size="s"
              title={i18n.SUBTASK_OF(parentTaskTitle)}
              iconType="branch"
              data-test-subj="cases-add-subtask-parent-notice"
            />
            <EuiSpacer size="m" />
          </>
        )}
        <EuiForm component="form" data-test-subj="cases-add-task-form">
          <TaskFormFields value={form} onChange={handleChange} titleError={titleError} />
        </EuiForm>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} flush="left" data-test-subj="cases-add-task-flyout-cancel">
              {i18n.CANCEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={handleSubmit}
              fill
              isLoading={isLoading}
              data-test-subj="cases-add-task-flyout-submit"
            >
              {flyoutTitle}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
