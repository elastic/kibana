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
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';
import moment from 'moment';
import type { CreateTaskRequest } from '../../containers/api';
import { useCreateTask } from '../../containers/use_create_task';
import { useCasesContext } from '../cases_context/use_cases_context';
import * as i18n from './translations';

interface AddTaskFlyoutProps {
  caseId: string;
  onClose: () => void;
}

const PRIORITY_OPTIONS = [
  { value: 'low', text: i18n.PRIORITY_LOW },
  { value: 'medium', text: i18n.PRIORITY_MEDIUM },
  { value: 'high', text: i18n.PRIORITY_HIGH },
  { value: 'critical', text: i18n.PRIORITY_CRITICAL },
];

const STATUS_OPTIONS = [
  { value: 'open', text: i18n.STATUS_OPEN },
  { value: 'in_progress', text: i18n.STATUS_IN_PROGRESS },
  { value: 'completed', text: i18n.STATUS_COMPLETED },
  { value: 'cancelled', text: i18n.STATUS_CANCELLED },
];

const AddTaskFlyoutComponent: React.FC<AddTaskFlyoutProps> = ({ caseId, onClose }) => {
  const { mutate: createTask, isLoading } = useCreateTask(caseId);
  const { owner } = useCasesContext();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<CreateTaskRequest['priority']>('medium');
  const [status, setStatus] = useState<CreateTaskRequest['status']>('open');
  const [dueDate, setDueDate] = useState<moment.Moment | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);

  const handleSubmit = useCallback(() => {
    if (!title.trim()) {
      setTitleError(i18n.TASK_TITLE_REQUIRED);
      return;
    }

    const request: CreateTaskRequest = {
      title: title.trim(),
      ...(description.trim() && { description: description.trim() }),
      priority,
      status,
      ...(dueDate && { due_date: dueDate.toISOString() }),
      owner: owner[0],
    };

    createTask(request, { onSuccess: onClose });
  }, [title, description, priority, status, dueDate, createTask, onClose]);

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
            {i18n.ADD_TASK}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiForm component="form" data-test-subj="cases-add-task-form">
          <EuiFormRow
            label={i18n.TASK_TITLE}
            isInvalid={titleError != null}
            error={titleError ?? undefined}
            fullWidth
          >
            <EuiFieldText
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (e.target.value.trim()) setTitleError(null);
              }}
              placeholder={i18n.TASK_TITLE_PLACEHOLDER}
              fullWidth
              data-test-subj="cases-add-task-title"
              autoFocus
            />
          </EuiFormRow>

          <EuiFormRow label={i18n.TASK_DESCRIPTION} fullWidth>
            <EuiTextArea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={i18n.TASK_DESCRIPTION_PLACEHOLDER}
              fullWidth
              rows={4}
              data-test-subj="cases-add-task-description"
            />
          </EuiFormRow>

          <EuiFormRow label={i18n.TASK_STATUS} fullWidth>
            <EuiSelect
              options={STATUS_OPTIONS}
              value={status}
              onChange={(e) => setStatus(e.target.value as CreateTaskRequest['status'])}
              fullWidth
              data-test-subj="cases-add-task-status"
            />
          </EuiFormRow>

          <EuiFormRow label={i18n.TASK_PRIORITY} fullWidth>
            <EuiSelect
              options={PRIORITY_OPTIONS}
              value={priority}
              onChange={(e) => setPriority(e.target.value as CreateTaskRequest['priority'])}
              fullWidth
              data-test-subj="cases-add-task-priority"
            />
          </EuiFormRow>

          <EuiFormRow label={i18n.TASK_DUE_DATE} fullWidth>
            <EuiDatePicker
              selected={dueDate}
              onChange={setDueDate}
              dateFormat="MM/DD/YYYY"
              placeholderText={i18n.TASK_DUE_DATE_PLACEHOLDER}
              fullWidth
              data-test-subj="cases-add-task-due-date"
            />
          </EuiFormRow>
        </EuiForm>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              onClick={onClose}
              flush="left"
              data-test-subj="cases-add-task-flyout-cancel"
            >
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
              {i18n.ADD_TASK}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

AddTaskFlyoutComponent.displayName = 'AddTaskFlyout';

export const AddTaskFlyout = React.memo(AddTaskFlyoutComponent);
