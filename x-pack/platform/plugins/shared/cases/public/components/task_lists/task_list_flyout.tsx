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
  EuiButtonIcon,
  EuiComboBox,
  EuiFieldNumber,
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
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { CaseTaskPriority } from '../../../common/types/domain/task/v1';
import type {
  CaseTaskTemplate,
  CaseTaskTemplateTask,
} from '../../../common/types/domain/task_template/v1';
import { MAX_TASKS_PER_CASE, MAX_TITLE_LENGTH } from '../../../common/constants';
import { useCasesContext } from '../cases_context/use_cases_context';
import { useCreateTaskTemplate, useUpdateTaskTemplate } from '../../containers/use_case_tasks';
import { severities } from '../severity/config';
import * as i18n from './translations';

const PRIORITY_OPTIONS = (Object.keys(severities) as CaseTaskPriority[]).map((value) => ({
  value,
  text: severities[value].label,
}));

interface TaskDraft {
  title: string;
  priority: CaseTaskPriority;
  dueInDays: string;
  subtasks: Array<{ title: string; priority: CaseTaskPriority; dueInDays: string }>;
}

const emptyTask = (): TaskDraft => ({ title: '', priority: 'medium', dueInDays: '', subtasks: [] });

const fromTemplate = (template?: CaseTaskTemplate): TaskDraft[] =>
  template?.tasks.map((task) => ({
    title: task.title,
    priority: task.priority,
    dueInDays: task.relative_due_days?.toString() ?? '',
    subtasks: task.subtasks.map((sub) => ({
      title: sub.title,
      priority: sub.priority,
      dueInDays: sub.relative_due_days?.toString() ?? '',
    })),
  })) ?? [emptyTask()];

const toDays = (value: string): number | null => (value.trim() === '' ? null : Number(value));

const toTemplateTasks = (drafts: TaskDraft[]): CaseTaskTemplateTask[] =>
  drafts
    .filter((task) => task.title.trim() !== '')
    .map((task) => ({
      title: task.title.trim(),
      description: '',
      priority: task.priority,
      relative_due_days: toDays(task.dueInDays),
      subtasks: task.subtasks
        .filter((sub) => sub.title.trim() !== '')
        .map((sub) => ({
          title: sub.title.trim(),
          description: '',
          priority: sub.priority,
          relative_due_days: toDays(sub.dueInDays),
        })),
    }));

interface TaskRowProps {
  task: { title: string; priority: CaseTaskPriority; dueInDays: string };
  isSubtask?: boolean;
  onChange: (patch: Partial<TaskRowProps['task']>) => void;
  onRemove: () => void;
  dataTestSubj: string;
}

const TaskRow: React.FC<TaskRowProps> = ({ task, isSubtask, onChange, onRemove, dataTestSubj }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiFlexGroup
      gutterSize="s"
      alignItems="center"
      responsive={false}
      css={{ paddingLeft: isSubtask ? euiTheme.size.xl : 0 }}
      data-test-subj={dataTestSubj}
    >
      <EuiFlexItem>
        <EuiFieldText
          compressed
          placeholder={i18n.TASK_TITLE_PLACEHOLDER}
          maxLength={MAX_TITLE_LENGTH}
          value={task.title}
          onChange={(event) => onChange({ title: event.target.value })}
          aria-label={i18n.TASK_TITLE_PLACEHOLDER}
          data-test-subj={`${dataTestSubj}-title`}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false} css={{ width: 120 }}>
        <EuiSelect
          compressed
          options={PRIORITY_OPTIONS}
          value={task.priority}
          onChange={(event) => onChange({ priority: event.target.value as CaseTaskPriority })}
          aria-label={i18n.PRIORITY}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false} css={{ width: 110 }}>
        <EuiFieldNumber
          compressed
          min={0}
          placeholder={i18n.DUE_IN_DAYS}
          value={task.dueInDays}
          onChange={(event) => onChange({ dueInDays: event.target.value })}
          aria-label={i18n.DUE_IN_DAYS}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiToolTip content={i18n.REMOVE_TASK} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="minusInCircle"
            color="danger"
            aria-label={i18n.REMOVE_TASK}
            onClick={onRemove}
            data-test-subj={`${dataTestSubj}-remove`}
          />
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

TaskRow.displayName = 'TaskRow';

export interface TaskListFlyoutProps {
  template?: CaseTaskTemplate;
  onClose: () => void;
}

export const TaskListFlyout: React.FC<TaskListFlyoutProps> = ({ template, onClose }) => {
  const titleId = useGeneratedHtmlId();
  const { owner } = useCasesContext();
  const { mutateAsync: createTaskTemplate, isLoading: isCreating } = useCreateTaskTemplate();
  const { mutateAsync: updateTaskTemplate, isLoading: isUpdating } = useUpdateTaskTemplate();

  const [name, setName] = useState(template?.name ?? '');
  const [description, setDescription] = useState(template?.description ?? '');
  const [tags, setTags] = useState<string[]>(template?.tags ?? []);
  const [tasks, setTasks] = useState<TaskDraft[]>(() => fromTemplate(template));
  const [showErrors, setShowErrors] = useState(false);

  const templateTasks = toTemplateTasks(tasks);
  const nameInvalid = name.trim() === '';
  const tasksInvalid = templateTasks.length === 0;
  const totalRows = tasks.reduce((count, task) => count + 1 + task.subtasks.length, 0);

  const updateTask = (index: number, patch: Partial<TaskDraft>) =>
    setTasks((prev) => prev.map((task, i) => (i === index ? { ...task, ...patch } : task)));

  const onSubmit = async () => {
    if (nameInvalid || tasksInvalid) {
      setShowErrors(true);
      return;
    }
    const fields = {
      name: name.trim(),
      description: description.trim(),
      tags,
      tasks: templateTasks,
    };
    if (template) {
      await updateTaskTemplate({
        templateId: template.id,
        request: { version: template.version, ...fields },
      });
    } else {
      await createTaskTemplate({ ...fields, owner: owner[0] });
    }
    onClose();
  };

  return (
    <EuiFlyout
      ownFocus
      size="m"
      onClose={onClose}
      aria-labelledby={titleId}
      data-test-subj="cases-task-list-flyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={titleId}>{template ? i18n.EDIT_TASK_LIST : i18n.ADD_TASK_LIST}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiForm component="form" onSubmit={(event) => event.preventDefault()}>
          <EuiFormRow
            label={i18n.FIELD_NAME}
            isInvalid={showErrors && nameInvalid}
            error={i18n.NAME_REQUIRED}
            fullWidth
          >
            <EuiFieldText
              autoFocus
              fullWidth
              maxLength={MAX_TITLE_LENGTH}
              value={name}
              isInvalid={showErrors && nameInvalid}
              onChange={(event) => setName(event.target.value)}
              data-test-subj="cases-task-list-name"
            />
          </EuiFormRow>
          <EuiFormRow label={i18n.FIELD_DESCRIPTION} fullWidth>
            <EuiTextArea
              fullWidth
              rows={2}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              data-test-subj="cases-task-list-description"
            />
          </EuiFormRow>
          <EuiFormRow label={i18n.FIELD_TAGS} fullWidth>
            <EuiComboBox<string>
              fullWidth
              noSuggestions
              selectedOptions={tags.map((tag) => ({ label: tag }))}
              onCreateOption={(tag) => setTags((prev) => [...prev, tag])}
              onChange={(selected) => setTags(selected.map(({ label }) => label))}
              data-test-subj="cases-task-list-tags"
            />
          </EuiFormRow>
          <EuiFormRow
            label={i18n.FIELD_TASKS}
            isInvalid={showErrors && tasksInvalid}
            error={i18n.TASKS_REQUIRED}
            fullWidth
          >
            <div>
              {tasks.map((task, index) => (
                <div key={index}>
                  <TaskRow
                    task={task}
                    onChange={(patch) => updateTask(index, patch)}
                    onRemove={() => setTasks((prev) => prev.filter((_, i) => i !== index))}
                    dataTestSubj={`cases-task-list-task-${index}`}
                  />
                  {task.subtasks.map((sub, subIndex) => (
                    <React.Fragment key={subIndex}>
                      <EuiSpacer size="xs" />
                      <TaskRow
                        task={sub}
                        isSubtask
                        onChange={(patch) =>
                          updateTask(index, {
                            subtasks: task.subtasks.map((s, i) =>
                              i === subIndex ? { ...s, ...patch } : s
                            ),
                          })
                        }
                        onRemove={() =>
                          updateTask(index, {
                            subtasks: task.subtasks.filter((_, i) => i !== subIndex),
                          })
                        }
                        dataTestSubj={`cases-task-list-task-${index}-subtask-${subIndex}`}
                      />
                    </React.Fragment>
                  ))}
                  {totalRows < MAX_TASKS_PER_CASE && (
                    <EuiButtonEmpty
                      size="xs"
                      iconType="branch"
                      onClick={() =>
                        updateTask(index, {
                          subtasks: [
                            ...task.subtasks,
                            { title: '', priority: 'medium', dueInDays: '' },
                          ],
                        })
                      }
                      data-test-subj={`cases-task-list-task-${index}-add-subtask`}
                    >
                      {i18n.ADD_SUBTASK}
                    </EuiButtonEmpty>
                  )}
                  <EuiSpacer size="s" />
                </div>
              ))}
              {totalRows < MAX_TASKS_PER_CASE && (
                <EuiButtonEmpty
                  size="s"
                  iconType="plusInCircle"
                  onClick={() => setTasks((prev) => [...prev, emptyTask()])}
                  data-test-subj="cases-task-list-add-task"
                >
                  {i18n.ADD_TASK}
                </EuiButtonEmpty>
              )}
            </div>
          </EuiFormRow>
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty flush="left" onClick={onClose}>
              {i18n.CANCEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              isLoading={isCreating || isUpdating}
              onClick={onSubmit}
              data-test-subj="cases-task-list-submit"
            >
              {template ? i18n.SAVE_TASK_LIST : i18n.ADD_TASK_LIST}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

TaskListFlyout.displayName = 'TaskListFlyout';
