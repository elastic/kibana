/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import type { DropResult } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiComboBox,
  EuiDragDropContext,
  EuiDraggable,
  EuiDroppable,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiIcon,
  EuiPanel,
  EuiScreenReaderOnly,
  EuiSpacer,
  EuiSwitch,
  EuiTextArea,
  EuiTitle,
  euiDragDropReorder,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type {
  CaseTaskTemplate,
  CaseTaskTemplateSubtask,
  CaseTaskTemplateTask,
} from '../../../common/types/domain/task_template/v1';
import { MAX_TASKS_PER_CASE, MAX_TITLE_LENGTH } from '../../../common/constants';
import { useCasesContext } from '../cases_context/use_cases_context';
import { useCreateTaskTemplate, useUpdateTaskTemplate } from '../../containers/use_case_tasks';
import { DueWithinField, type DueWithinDraft } from '../tasks/due_within_field';
import { PRIORITY_OPTIONS } from '../tasks/priority_options';
import * as i18n from './translations';

type RowDraft = Omit<CaseTaskTemplateSubtask, 'due_within'> & { dueWithin: DueWithinDraft };
interface TaskDraft extends RowDraft {
  subtasks: RowDraft[];
}

const emptyRow = (): RowDraft => ({
  title: '',
  description: '',
  priority: 'medium',
  required: false,
  dueWithin: { value: '', unit: 'hours' },
});

const toDraft = (entry: CaseTaskTemplateSubtask): RowDraft => ({
  title: entry.title,
  description: entry.description,
  priority: entry.priority,
  required: entry.required,
  dueWithin: entry.due_within
    ? { value: String(entry.due_within.value), unit: entry.due_within.unit }
    : { value: '', unit: 'hours' },
});

const fromTemplate = (template?: CaseTaskTemplate): TaskDraft[] =>
  template?.tasks.map((task) => ({ ...toDraft(task), subtasks: task.subtasks.map(toDraft) })) ?? [
    { ...emptyRow(), subtasks: [] },
  ];

const toEntry = (draft: RowDraft): CaseTaskTemplateSubtask => ({
  title: draft.title.trim(),
  description: draft.description.trim(),
  priority: draft.priority,
  required: draft.required,
  due_within:
    draft.dueWithin.value.trim() === '' || Number(draft.dueWithin.value) <= 0
      ? null
      : { value: Number(draft.dueWithin.value), unit: draft.dueWithin.unit },
});

const toTemplateTasks = (drafts: TaskDraft[]): CaseTaskTemplateTask[] =>
  drafts
    .filter((task) => task.title.trim() !== '')
    .map((task) => ({
      ...toEntry(task),
      subtasks: task.subtasks.filter((sub) => sub.title.trim() !== '').map(toEntry),
    }));

interface TaskEditorRowProps {
  draft: RowDraft;
  isSubtask?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLElement>;
  onChange: (patch: Partial<RowDraft>) => void;
  onRemove: () => void;
  onAddSubtask?: () => void;
  dataTestSubj: string;
}

/** One task of the list. Title and description take the full width so long titles stay readable. */
const TaskEditorRow: React.FC<TaskEditorRowProps> = ({
  draft,
  isSubtask,
  dragHandleProps,
  onChange,
  onRemove,
  onAddSubtask,
  dataTestSubj,
}) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiPanel
      hasBorder
      paddingSize="s"
      css={{ marginLeft: isSubtask ? euiTheme.size.xl : 0, marginBottom: euiTheme.size.s }}
      data-test-subj={dataTestSubj}
    >
      <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
        {dragHandleProps && (
          <EuiFlexItem grow={false} css={{ paddingTop: euiTheme.size.xs }}>
            <div
              {...dragHandleProps}
              aria-label={i18n.DRAG_HANDLE}
              data-test-subj={`${dataTestSubj}-handle`}
            >
              <EuiIcon type="drag" size="s" color="subdued" aria-hidden={true} />
            </div>
          </EuiFlexItem>
        )}
        <EuiFlexItem>
          <EuiFieldText
            compressed
            fullWidth
            placeholder={isSubtask ? i18n.SUBTASK_TITLE_PLACEHOLDER : i18n.TASK_TITLE_PLACEHOLDER}
            maxLength={MAX_TITLE_LENGTH}
            value={draft.title}
            onChange={(event) => onChange({ title: event.target.value })}
            aria-label={i18n.TASK_TITLE_PLACEHOLDER}
            data-test-subj={`${dataTestSubj}-title`}
          />
          <EuiSpacer size="xs" />
          <EuiTextArea
            compressed
            fullWidth
            rows={1}
            resize="vertical"
            placeholder={i18n.TASK_DESCRIPTION_PLACEHOLDER}
            value={draft.description}
            onChange={(event) => onChange({ description: event.target.value })}
            aria-label={i18n.TASK_DESCRIPTION_PLACEHOLDER}
            data-test-subj={`${dataTestSubj}-description`}
          />
          <EuiSpacer size="s" />
          <EuiFlexGroup gutterSize="m" alignItems="flexEnd" responsive={false} wrap>
            <EuiFlexItem grow={false}>
              <EuiFormRow label={i18n.PRIORITY} display="rowCompressed">
                <EuiComboBox<CaseTaskTemplateSubtask['priority']>
                  compressed
                  singleSelection={{ asPlainText: true }}
                  isClearable={false}
                  options={PRIORITY_OPTIONS}
                  selectedOptions={PRIORITY_OPTIONS.filter(({ value }) => value === draft.priority)}
                  onChange={([selected]) =>
                    selected?.value && onChange({ priority: selected.value })
                  }
                  css={{ width: 130 }}
                  aria-label={i18n.PRIORITY}
                  data-test-subj={`${dataTestSubj}-priority`}
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <DueWithinField
                value={draft.dueWithin}
                onChange={(dueWithin) => onChange({ dueWithin })}
                dataTestSubj={`${dataTestSubj}-due`}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false} css={{ paddingBottom: euiTheme.size.xs }}>
              <EuiSwitch
                compressed
                label={i18n.REQUIRED}
                checked={draft.required}
                onChange={(event) => onChange({ required: event.target.checked })}
                data-test-subj={`${dataTestSubj}-required`}
              />
            </EuiFlexItem>
            <EuiFlexItem />
            {onAddSubtask && (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="xs"
                  iconType="branch"
                  onClick={onAddSubtask}
                  data-test-subj={`${dataTestSubj}-add-subtask`}
                >
                  {i18n.ADD_SUBTASK}
                </EuiButtonEmpty>
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="xs"
                color="danger"
                iconType="trash"
                onClick={onRemove}
                data-test-subj={`${dataTestSubj}-remove`}
              >
                {isSubtask ? i18n.REMOVE_SUBTASK : i18n.REMOVE_TASK}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

TaskEditorRow.displayName = 'TaskEditorRow';

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
  const [announcement, setAnnouncement] = useState('');

  const templateTasks = toTemplateTasks(tasks);
  const nameInvalid = name.trim() === '';
  const tasksInvalid = templateTasks.length === 0;
  const totalRows = tasks.reduce((count, task) => count + 1 + task.subtasks.length, 0);

  const updateTask = (index: number, patch: Partial<TaskDraft>) =>
    setTasks((prev) => prev.map((task, i) => (i === index ? { ...task, ...patch } : task)));

  const onDragEnd = useCallback(({ source, destination }: DropResult) => {
    if (!destination) return;
    setTasks((prev) => {
      const reordered = euiDragDropReorder(prev, source.index, destination.index);
      setAnnouncement(
        i18n.TASK_MOVED(reordered[destination.index].title, destination.index + 1, reordered.length)
      );
      return reordered;
    });
  }, []);

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
            helpText={i18n.TASKS_HELP}
            isInvalid={showErrors && tasksInvalid}
            error={i18n.TASKS_REQUIRED}
            fullWidth
          >
            <div>
              <EuiScreenReaderOnly>
                <div aria-live="polite" role="status">
                  {announcement}
                </div>
              </EuiScreenReaderOnly>
              <EuiDragDropContext onDragEnd={onDragEnd}>
                <EuiDroppable droppableId="cases-task-list-tasks" spacing="none">
                  {tasks.map((task, index) => (
                    <EuiDraggable
                      key={`task-${index}`}
                      index={index}
                      draggableId={`task-${index}`}
                      customDragHandle
                      hasInteractiveChildren
                      spacing="none"
                    >
                      {(provided) => (
                        <div>
                          <TaskEditorRow
                            draft={task}
                            dragHandleProps={provided.dragHandleProps ?? undefined}
                            onChange={(patch) => updateTask(index, patch)}
                            onRemove={() => setTasks((prev) => prev.filter((_, i) => i !== index))}
                            onAddSubtask={
                              totalRows < MAX_TASKS_PER_CASE
                                ? () =>
                                    updateTask(index, { subtasks: [...task.subtasks, emptyRow()] })
                                : undefined
                            }
                            dataTestSubj={`cases-task-list-task-${index}`}
                          />
                          {task.subtasks.map((sub, subIndex) => (
                            <TaskEditorRow
                              key={subIndex}
                              draft={sub}
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
                          ))}
                        </div>
                      )}
                    </EuiDraggable>
                  ))}
                </EuiDroppable>
              </EuiDragDropContext>
              {totalRows < MAX_TASKS_PER_CASE && (
                <EuiButtonEmpty
                  size="s"
                  iconType="plusInCircle"
                  onClick={() => setTasks((prev) => [...prev, { ...emptyRow(), subtasks: [] }])}
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
