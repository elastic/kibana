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
  EuiButtonIcon,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { CaseTaskTemplate } from '../../../common/types/domain/task_template/v1';
import type { CreateTaskTemplateRequest } from '../../containers/api';
import { useCreateTaskTemplate } from '../../containers/use_create_task_template';
import { useUpdateTaskTemplate } from '../../containers/use_update_task_template';
import { useCasesContext } from '../cases_context/use_cases_context';
import * as i18n from '../configure_cases/translations';
import * as taskI18n from '../tasks/translations';

const PRIORITY_OPTIONS = [
  { value: 'low' as const, text: taskI18n.PRIORITY_LOW },
  { value: 'medium' as const, text: taskI18n.PRIORITY_MEDIUM },
  { value: 'high' as const, text: taskI18n.PRIORITY_HIGH },
  { value: 'critical' as const, text: taskI18n.PRIORITY_CRITICAL },
];

interface TaskEntry {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  relative_due_days: string; // string for input, convert to number on submit
}

const defaultTask = (): TaskEntry => ({
  title: '',
  description: '',
  priority: 'medium',
  relative_due_days: '',
});

interface TaskTemplateFlyoutProps {
  templateToEdit: CaseTaskTemplate | null;
  onClose: () => void;
}

export const TaskTemplateFlyout: React.FC<TaskTemplateFlyoutProps> = ({
  templateToEdit,
  onClose,
}) => {
  const { owner } = useCasesContext();
  const titleId = useGeneratedHtmlId();

  const isEdit = templateToEdit != null;

  const [name, setName] = useState(templateToEdit?.name ?? '');
  const [description, setDescription] = useState(templateToEdit?.description ?? '');
  const [scope, setScope] = useState<'global' | 'space'>(templateToEdit?.scope ?? 'space');
  const [tasks, setTasks] = useState<TaskEntry[]>(() => {
    if (templateToEdit?.tasks?.length) {
      return templateToEdit.tasks.map((t) => ({
        title: t.title,
        description: t.description ?? '',
        priority: t.priority,
        relative_due_days: t.relative_due_days != null ? String(t.relative_due_days) : '',
      }));
    }
    return [defaultTask()];
  });

  const [nameError, setNameError] = useState<string | null>(null);
  const [tasksError, setTasksError] = useState<string | null>(null);

  const { mutate: createTemplate, isLoading: isCreating } = useCreateTaskTemplate();
  const { mutate: updateTemplate, isLoading: isUpdating } = useUpdateTaskTemplate();
  const isLoading = isCreating || isUpdating;

  const updateTask = useCallback(
    (index: number, field: keyof TaskEntry, value: string) => {
      setTasks((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], [field]: value };
        return next;
      });
      setTasksError(null);
    },
    []
  );

  const addTask = useCallback(() => {
    setTasks((prev) => [...prev, defaultTask()]);
  }, []);

  const removeTask = useCallback((index: number) => {
    setTasks((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const validate = (): boolean => {
    let valid = true;
    if (!name.trim()) {
      setNameError(i18n.TASK_TEMPLATE_NAME_REQUIRED);
      valid = false;
    } else {
      setNameError(null);
    }
    const invalidTasks = tasks.some((t) => !t.title.trim());
    if (invalidTasks || tasks.length === 0) {
      setTasksError(i18n.TASK_TEMPLATE_TASKS_REQUIRED);
      valid = false;
    } else {
      setTasksError(null);
    }
    return valid;
  };

  const handleSave = useCallback(() => {
    if (!validate()) return;

    const taskPayload: CreateTaskTemplateRequest['tasks'] = tasks.map((t, idx) => ({
      title: t.title.trim(),
      description: t.description,
      priority: t.priority,
      relative_due_days: t.relative_due_days ? Number(t.relative_due_days) : null,
      sort_order: idx,
      subtasks: [],
    }));

    if (isEdit && templateToEdit) {
      updateTemplate(
        {
          templateId: templateToEdit.id,
          request: {
            version: templateToEdit.version,
            name: name.trim(),
            description,
            scope,
            tasks: taskPayload,
          },
        },
        { onSuccess: onClose }
      );
    } else {
      createTemplate(
        {
          name: name.trim(),
          description,
          scope,
          tasks: taskPayload,
          owner: owner[0] ?? 'cases',
        },
        { onSuccess: onClose }
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, description, scope, tasks, isEdit, templateToEdit, createTemplate, updateTemplate, onClose, owner]);

  return (
    <EuiFlyout onClose={onClose} aria-labelledby={titleId} data-test-subj="cases-task-template-flyout">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h3 id={titleId}>
            {isEdit ? i18n.EDIT_TASK_TEMPLATE : i18n.ADD_TASK_TEMPLATE}
          </h3>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiFormRow
          label={i18n.TASK_TEMPLATE_NAME}
          isInvalid={nameError != null}
          error={nameError ?? undefined}
          fullWidth
        >
          <EuiFieldText
            fullWidth
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setNameError(null);
            }}
            data-test-subj="cases-task-template-name"
          />
        </EuiFormRow>

        <EuiSpacer size="m" />

        <EuiFormRow label={i18n.TASK_TEMPLATE_DESCRIPTION} fullWidth>
          <EuiFieldText
            fullWidth
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            data-test-subj="cases-task-template-description"
          />
        </EuiFormRow>

        <EuiSpacer size="m" />

        <EuiFormRow label="Scope" fullWidth>
          <EuiSelect
            fullWidth
            value={scope}
            onChange={(e) => setScope(e.target.value as 'global' | 'space')}
            options={[
              { value: 'space', text: 'Space' },
              { value: 'global', text: 'Global' },
            ]}
            data-test-subj="cases-task-template-scope"
          />
        </EuiFormRow>

        <EuiSpacer size="l" />

        <EuiText size="s">
          <strong>{i18n.TASK_TEMPLATE_TASKS_COUNT}</strong>
        </EuiText>
        {tasksError && (
          <EuiText size="xs" color="danger">
            {tasksError}
          </EuiText>
        )}
        <EuiSpacer size="s" />

        {tasks.map((task, idx) => (
          <EuiPanel key={idx} paddingSize="s" hasBorder color="subdued" hasShadow={false}>
            <EuiFlexGroup alignItems="center" gutterSize="s">
              <EuiFlexItem>
                <EuiText size="xs" color="subdued">
                  Task {idx + 1}
                </EuiText>
              </EuiFlexItem>
              {tasks.length > 1 && (
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    iconType="trash"
                    color="danger"
                    size="xs"
                    aria-label={i18n.REMOVE_TASK_FROM_TEMPLATE}
                    onClick={() => removeTask(idx)}
                    data-test-subj={`cases-task-template-remove-task-${idx}`}
                  />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
            <EuiSpacer size="xs" />
            <EuiFormRow label={i18n.TASK_TEMPLATE_TASK_TITLE} fullWidth>
              <EuiFieldText
                fullWidth
                value={task.title}
                onChange={(e) => updateTask(idx, 'title', e.target.value)}
                data-test-subj={`cases-task-template-task-title-${idx}`}
              />
            </EuiFormRow>
            <EuiSpacer size="xs" />
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem>
                <EuiFormRow label={i18n.TASK_TEMPLATE_DESCRIPTION} fullWidth>
                  <EuiFieldText
                    fullWidth
                    value={task.description}
                    onChange={(e) => updateTask(idx, 'description', e.target.value)}
                    data-test-subj={`cases-task-template-task-description-${idx}`}
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFormRow label={taskI18n.TASK_PRIORITY}>
                  <EuiSelect
                    value={task.priority}
                    options={PRIORITY_OPTIONS}
                    onChange={(e) => updateTask(idx, 'priority', e.target.value)}
                    data-test-subj={`cases-task-template-task-priority-${idx}`}
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFormRow label="Due (days)">
                  <EuiFieldText
                    value={task.relative_due_days}
                    onChange={(e) => updateTask(idx, 'relative_due_days', e.target.value)}
                    placeholder="e.g. 7"
                    style={{ width: 80 }}
                    data-test-subj={`cases-task-template-task-due-days-${idx}`}
                  />
                </EuiFormRow>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        ))}

        <EuiSpacer size="s" />
        <EuiButtonEmpty
          iconType="plusInCircle"
          size="s"
          onClick={addTask}
          data-test-subj="cases-task-template-add-task"
        >
          {i18n.ADD_TASK_TO_TEMPLATE}
        </EuiButtonEmpty>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="flexStart">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} isLoading={isLoading} data-test-subj="cases-task-template-cancel">
              {taskI18n.CANCEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                onClick={handleSave}
                isLoading={isLoading}
                data-test-subj="cases-task-template-save"
              >
                {taskI18n.SAVE_CHANGES}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
