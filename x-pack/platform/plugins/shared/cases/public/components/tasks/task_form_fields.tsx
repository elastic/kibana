/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiDatePicker,
  EuiFieldText,
  EuiFormRow,
  EuiSelect,
  EuiTextArea,
} from '@elastic/eui';
import moment from 'moment';
import type { CaseTaskPriority, CaseTaskStatus } from '../../../common/types/domain/task/v1';
import { TaskAssigneesField } from './task_assignees_field';
import { useTaskStatuses } from './use_task_statuses';
import * as i18n from './translations';

export interface TaskFormState {
  title: string;
  description: string;
  status: CaseTaskStatus;
  priority: CaseTaskPriority;
  dueDate: moment.Moment | null;
  assignees: Array<{ uid: string }>;
  completionNotes: string;
}

interface TaskFormFieldsProps {
  value: TaskFormState;
  onChange: (updates: Partial<TaskFormState>) => void;
  titleError: string | null;
}

const PRIORITY_OPTIONS: Array<{ value: CaseTaskPriority; text: string }> = [
  { value: 'low', text: i18n.PRIORITY_LOW },
  { value: 'medium', text: i18n.PRIORITY_MEDIUM },
  { value: 'high', text: i18n.PRIORITY_HIGH },
  { value: 'critical', text: i18n.PRIORITY_CRITICAL },
];

export const TaskFormFields: React.FC<TaskFormFieldsProps> = ({ value, onChange, titleError }) => {
  const taskStatuses = useTaskStatuses();
  const STATUS_OPTIONS = useMemo(() => {
    const options = taskStatuses
      .filter((s) => !s.disabled)
      .map((s) => ({ value: s.key as CaseTaskStatus, text: s.label }));
    const isKnown = options.some((o) => o.value === value.status);
    if (!isKnown) {
      options.unshift({ value: value.status, text: i18n.NO_STATUS });
    }
    return options;
  }, [taskStatuses, value.status]);
  const isCompleted = value.status === 'done';

  return (
    <>
      <EuiFormRow
        label={i18n.TASK_TITLE}
        isInvalid={titleError != null}
        error={titleError ?? undefined}
        fullWidth
      >
        <EuiFieldText
          value={value.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder={i18n.TASK_TITLE_PLACEHOLDER}
          fullWidth
          autoFocus
          data-test-subj="cases-task-form-title"
        />
      </EuiFormRow>

      <EuiFormRow label={i18n.TASK_DESCRIPTION} fullWidth>
        <EuiTextArea
          value={value.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder={i18n.TASK_DESCRIPTION_PLACEHOLDER}
          fullWidth
          rows={3}
          data-test-subj="cases-task-form-description"
        />
      </EuiFormRow>

      <EuiFormRow label={i18n.TASK_STATUS} fullWidth>
        <EuiSelect
          options={STATUS_OPTIONS}
          value={value.status}
          onChange={(e) => onChange({ status: e.target.value as CaseTaskStatus })}
          fullWidth
          data-test-subj="cases-task-form-status"
        />
      </EuiFormRow>

      {isCompleted && (
        <EuiFormRow label={i18n.COMPLETION_NOTES} fullWidth>
          <EuiTextArea
            value={value.completionNotes}
            onChange={(e) => onChange({ completionNotes: e.target.value })}
            placeholder={i18n.COMPLETION_NOTES_PLACEHOLDER}
            fullWidth
            rows={3}
            data-test-subj="cases-task-form-completion-notes"
          />
        </EuiFormRow>
      )}

      <EuiFormRow label={i18n.TASK_PRIORITY} fullWidth>
        <EuiSelect
          options={PRIORITY_OPTIONS}
          value={value.priority}
          onChange={(e) => onChange({ priority: e.target.value as CaseTaskPriority })}
          fullWidth
          data-test-subj="cases-task-form-priority"
        />
      </EuiFormRow>

      <EuiFormRow label={i18n.TASK_DUE_DATE} fullWidth>
        <EuiDatePicker
          selected={value.dueDate}
          onChange={(date) => onChange({ dueDate: date })}
          dateFormat="MM/DD/YYYY"
          placeholderText={i18n.TASK_DUE_DATE_PLACEHOLDER}
          fullWidth
          data-test-subj="cases-task-form-due-date"
        />
      </EuiFormRow>

      <TaskAssigneesField
        value={value.assignees}
        onChange={(assignees) => onChange({ assignees })}
      />
    </>
  );
};
