/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
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
  EuiFormRow,
  EuiIcon,
  EuiScreenReaderOnly,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { DropResult, EuiComboBoxOptionOption } from '@elastic/eui';
import { css } from '@emotion/react';
import { INVESTIGATION_LIMITS } from '../../../../common/investigations/constants';
import type { TaskList } from '../../../../common/investigations/types';
import { useCasesContext } from '../../../components/cases_context/use_cases_context';
import {
  getHttpErrorMessage,
  getHttpErrorStatus,
  useInvestigationToasts,
  useSaveTaskList,
  useTaskLists,
} from '../../hooks';
import { useWorkflowList } from '../../hooks/use_tasks';
import { ICONS } from '../../icons';
import { ConfirmModal, ErrorState, LoadingState } from '../shared';
import { TemplateTaskRow } from './template_task_row';
import {
  MAX_SUBTASKS_PER_TASK,
  MAX_TEMPLATE_TASKS,
  countDraftTasks,
  createBlankDraft,
  createBlankSubtask,
  createDraftKey,
  serializeDraft,
  toDraft,
  toTemplateTasks,
  validateDraft,
} from './template_draft';
import type { DraftSubtask, DraftTask } from './template_draft';
import * as i18n from '../procedure/translations';
import * as settingsI18n from './translations';

const MAX_NAME_LENGTH = 160;
const MAX_TAGS = 200;

/** A stable string of what would be saved, to tell whether the form changed. */
const snapshotOf = (
  name: string,
  description: string,
  tags: readonly string[],
  draft: readonly DraftTask[]
): string =>
  JSON.stringify({
    name: name.trim(),
    description: description.trim(),
    tags,
    tasks: serializeDraft(draft),
  });

export interface TaskListEditorProps {
  /** The task list to edit. Omit it to add a new one. */
  taskListId?: string;
  onClose: () => void;
  /** Called with the saved list, before `onClose`. */
  onSaved?: (taskList: TaskList) => void;
  /** Skip the success toast, when the caller already shows the result. */
  silent?: boolean;
}

/**
 * Adds or edits one reusable task list: its name, description and tags, and the tasks it adds to an
 * investigation.
 */
export const TaskListEditor: React.FC<TaskListEditorProps> = ({
  taskListId,
  onClose,
  onSaved,
  silent = false,
}) => {
  const flyoutTitleId = useGeneratedHtmlId();
  const { euiTheme } = useEuiTheme();
  const { showSuccess } = useInvestigationToasts();
  const { permissions } = useCasesContext();
  const taskListsQuery = useTaskLists();
  const workflowsQuery = useWorkflowList();
  const saveTaskList = useSaveTaskList();

  const counter = useRef(0);
  const nextKey = useCallback(() => {
    counter.current += 1;
    return createDraftKey(counter.current);
  }, []);

  const isNew = taskListId === undefined;
  const [loaded, setLoaded] = useState(isNew);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [draft, setDraft] = useState<DraftTask[]>([]);
  const [baseline, setBaseline] = useState(() => snapshotOf('', '', [], []));
  const [showErrors, setShowErrors] = useState(false);
  const [isDiscardOpen, setIsDiscardOpen] = useState(false);
  const [isForbidden, setIsForbidden] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');

  const taskLists = taskListsQuery.data?.task_lists;
  const readOnly = !permissions.settings || isForbidden;
  const selected = taskLists?.find((list) => list.id === taskListId);

  // Load the form once, not on every refetch of the lists.
  useEffect(() => {
    if (!selected || loaded) {
      return;
    }
    const initial = toDraft(selected.tasks, nextKey);
    setName(selected.name);
    setDescription(selected.description);
    setTags(selected.tags);
    setDraft(initial);
    setBaseline(snapshotOf(selected.name, selected.description, selected.tags, initial));
    setLoaded(true);
  }, [selected, loaded, nextKey]);

  const isDirty = snapshotOf(name, description, tags, draft) !== baseline;
  const errors = useMemo(() => validateDraft(draft), [draft]);
  const totalTasks = countDraftTasks(draft);
  const trimmedName = name.trim();
  const nameError =
    trimmedName.length === 0
      ? settingsI18n.NAME_REQUIRED
      : trimmedName.length > MAX_NAME_LENGTH
      ? settingsI18n.NAME_TOO_LONG
      : undefined;
  const descriptionError =
    description.length > INVESTIGATION_LIMITS.maxTextLength
      ? settingsI18n.DESCRIPTION_TOO_LONG
      : undefined;
  const tagsError = tags.length > MAX_TAGS ? settingsI18n.TAGS_TOO_MANY(MAX_TAGS) : undefined;
  const tasksError = draft.length === 0 ? settingsI18n.TASKS_REQUIRED : undefined;
  const hasErrors =
    Object.keys(errors).length > 0 ||
    totalTasks > MAX_TEMPLATE_TASKS ||
    Boolean(nameError || descriptionError || tagsError || tasksError);
  const isFull = totalTasks >= MAX_TEMPLATE_TASKS;

  const updateTask = (key: string, patch: Partial<DraftTask>) =>
    setDraft((current) => current.map((task) => (task.key === key ? { ...task, ...patch } : task)));
  const removeTask = (key: string) =>
    setDraft((current) =>
      current
        .filter((task) => task.key !== key)
        .map((task) => (task.afterKey === key ? { ...task, afterKey: '' } : task))
    );
  const addTask = () =>
    setDraft((current) => [...current, createBlankDraft(nextKey(), i18n.EDITOR_NEW_TASK)]);
  const addSubtask = (taskKey: string) =>
    setDraft((current) =>
      current.map((task) =>
        task.key === taskKey
          ? {
              ...task,
              subtasks: [...task.subtasks, createBlankSubtask(nextKey(), i18n.EDITOR_NEW_SUBTASK)],
            }
          : task
      )
    );
  const updateSubtask = (taskKey: string, subtaskKey: string, patch: Partial<DraftSubtask>) =>
    setDraft((current) =>
      current.map((task) =>
        task.key === taskKey
          ? {
              ...task,
              subtasks: task.subtasks.map((subtask) =>
                subtask.key === subtaskKey ? { ...subtask, ...patch } : subtask
              ),
            }
          : task
      )
    );
  const removeSubtask = (taskKey: string, subtaskKey: string) =>
    setDraft((current) =>
      current.map((task) =>
        task.key === taskKey
          ? { ...task, subtasks: task.subtasks.filter((subtask) => subtask.key !== subtaskKey) }
          : task
      )
    );

  const handleDragEnd = ({ source, destination }: DropResult) => {
    if (!destination || destination.index === source.index) {
      return;
    }
    const next = [...draft];
    const [moved] = next.splice(source.index, 1);
    next.splice(destination.index, 0, moved);
    setDraft(next);
    setAnnouncement(
      i18n.MOVED_ANNOUNCEMENT(
        moved.title.trim() || i18n.EDITOR_NEW_TASK,
        destination.index + 1,
        next.length
      )
    );
  };

  const requestClose = () => (isDirty ? setIsDiscardOpen(true) : onClose());

  const handleSave = async () => {
    setShowErrors(true);
    setSaveError(null);
    if (hasErrors) {
      return;
    }
    try {
      const { task_list: saved } = await saveTaskList.mutateAsync({
        taskListId,
        body: {
          name: trimmedName,
          description: description.trim(),
          tags,
          tasks: toTemplateTasks(draft),
          version: selected?.version,
        },
      });
      if (!silent) {
        showSuccess(i18n.EDITOR_SAVED(saved.name));
      }
      setBaseline(snapshotOf(name, description, tags, draft));
      onSaved?.(saved);
      onClose();
    } catch (error) {
      if (getHttpErrorStatus(error) === 403) {
        setIsForbidden(true);
        return;
      }
      setSaveError(getHttpErrorMessage(error));
    }
  };

  const renderBody = () => {
    if (!isNew && taskListsQuery.isLoading) {
      return <LoadingState label={i18n.EDITOR_LOADING} />;
    }
    if (!isNew && (taskListsQuery.error || !taskLists)) {
      return (
        <ErrorState
          title={i18n.EDITOR_LOAD_ERROR}
          error={taskListsQuery.error}
          onRetry={() => void taskListsQuery.refetch()}
        />
      );
    }
    if (!isNew && !selected) {
      return (
        <EuiCallOut
          announceOnMount
          color="warning"
          size="s"
          title={settingsI18n.TASK_LIST_UNAVAILABLE_TITLE}
          text={<p>{settingsI18n.TASK_LIST_UNAVAILABLE_BODY}</p>}
          data-test-subj="investigationTaskListUnavailable"
        />
      );
    }
    return (
      <>
        {readOnly ? (
          <>
            <EuiCallOut
              announceOnMount={false}
              size="s"
              color="primary"
              title={i18n.EDITOR_READ_ONLY_TITLE}
              text={<p>{i18n.EDITOR_READ_ONLY_BODY}</p>}
              data-test-subj="investigationTaskListReadOnly"
            />
            <EuiSpacer size="m" />
          </>
        ) : null}
        <EuiFormRow
          label={settingsI18n.FIELD_NAME}
          fullWidth
          isInvalid={showErrors && Boolean(nameError)}
          error={nameError}
        >
          <EuiFieldText
            fullWidth
            value={name}
            readOnly={readOnly}
            isInvalid={showErrors && Boolean(nameError)}
            onChange={(event) => setName(event.target.value)}
            data-test-subj="investigationTaskListName"
          />
        </EuiFormRow>
        <EuiFormRow
          label={settingsI18n.FIELD_DESCRIPTION}
          fullWidth
          isInvalid={showErrors && Boolean(descriptionError)}
          error={descriptionError}
        >
          <EuiTextArea
            fullWidth
            rows={2}
            value={description}
            readOnly={readOnly}
            isInvalid={showErrors && Boolean(descriptionError)}
            onChange={(event) => setDescription(event.target.value)}
            data-test-subj="investigationTaskListDescription"
          />
        </EuiFormRow>
        <EuiFormRow
          label={settingsI18n.FIELD_TAGS}
          fullWidth
          isInvalid={showErrors && Boolean(tagsError)}
          error={tagsError}
        >
          <EuiComboBox
            isInvalid={showErrors && Boolean(tagsError)}
            fullWidth
            noSuggestions
            isDisabled={readOnly}
            placeholder={settingsI18n.TAGS_PLACEHOLDER}
            selectedOptions={tags.map((tag) => ({ label: tag }))}
            onCreateOption={(value) => {
              const tag = value.trim().slice(0, INVESTIGATION_LIMITS.maxTagLength);
              if (tag.length > 0 && !tags.includes(tag)) {
                setTags([...tags, tag]);
              }
            }}
            onChange={(options: Array<EuiComboBoxOptionOption<string>>) =>
              setTags(options.map(({ label }) => label))
            }
            data-test-subj="investigationTaskListTags"
          />
        </EuiFormRow>
        <EuiSpacer size="m" />
        <EuiTitle size="xxs">
          <h3>{settingsI18n.FIELD_TASKS}</h3>
        </EuiTitle>
        {draft.length === 0 ? (
          <EuiText
            size="s"
            color={showErrors ? 'danger' : 'subdued'}
            data-test-subj="investigationTaskListEmpty"
          >
            <p>{showErrors ? settingsI18n.TASKS_REQUIRED : i18n.EDITOR_NO_TASKS}</p>
          </EuiText>
        ) : (
          <EuiText size="xs" color="subdued">
            <p>{i18n.EDITOR_DRAG_HELP}</p>
          </EuiText>
        )}
        <EuiSpacer size="s" />
        <EuiDragDropContext onDragEnd={handleDragEnd}>
          <EuiDroppable droppableId="template-tasks" spacing="m">
            {draft.map((task, index) => (
              <EuiDraggable
                key={task.key}
                draggableId={task.key}
                index={index}
                spacing="s"
                customDragHandle
                usePortal
                isDragDisabled={readOnly}
              >
                {(provided) => (
                  <div>
                    <TemplateTaskRow
                      draft={task}
                      index={index}
                      afterOptions={draft}
                      workflows={workflowsQuery.data?.results}
                      workflowsError={workflowsQuery.isError}
                      errors={showErrors ? errors[task.key] : undefined}
                      readOnly={readOnly}
                      canAddSubtask={!isFull && task.subtasks.length < MAX_SUBTASKS_PER_TASK}
                      dragHandle={
                        readOnly ? null : (
                          <div
                            {...provided.dragHandleProps}
                            aria-label={i18n.DRAG_TO_REORDER}
                            data-test-subj={`investigationTemplateDrag-${index}`}
                            css={css`
                              display: flex;
                              align-items: center;
                              cursor: grab;
                            `}
                          >
                            <EuiIcon type={ICONS.dragHandle} color="subdued" aria-hidden="true" />
                          </div>
                        )
                      }
                      onChange={updateTask}
                      onRemove={removeTask}
                      onAddSubtask={addSubtask}
                      onChangeSubtask={updateSubtask}
                      onRemoveSubtask={removeSubtask}
                    />
                  </div>
                )}
              </EuiDraggable>
            ))}
          </EuiDroppable>
        </EuiDragDropContext>
        <EuiSpacer size="s" />
        {readOnly || isFull ? null : (
          <EuiButtonEmpty
            size="s"
            iconType={ICONS.add}
            onClick={addTask}
            data-test-subj="investigationTaskListAddTask"
          >
            {i18n.EDITOR_ADD_TASK}
          </EuiButtonEmpty>
        )}
        {isFull ? (
          <EuiText size="xs" color="subdued" data-test-subj="investigationTaskListMaxTasks">
            {i18n.MAX_TASKS_REACHED(MAX_TEMPLATE_TASKS)}
          </EuiText>
        ) : null}
        {saveError ? (
          <>
            <EuiSpacer size="s" />
            <EuiCallOut
              announceOnMount
              color="danger"
              size="s"
              title={i18n.EDITOR_SAVE_ERROR}
              text={<p>{saveError}</p>}
              data-test-subj="investigationTaskListSaveError"
            />
          </>
        ) : null}
        {showErrors && hasErrors ? (
          <>
            <EuiSpacer size="s" />
            <EuiCallOut
              announceOnMount
              color="danger"
              size="s"
              title={i18n.EDITOR_FIX_ERRORS}
              data-test-subj="investigationTaskListErrors"
            />
          </>
        ) : null}
      </>
    );
  };

  const canSave = isNew || Boolean(selected);

  return (
    <>
      <EuiFlyout
        onClose={requestClose}
        size="l"
        ownFocus
        aria-labelledby={flyoutTitleId}
        data-test-subj="investigationTaskListEditor"
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2 id={flyoutTitleId}>
              {isNew ? settingsI18n.EDITOR_ADD_TITLE : settingsI18n.EDITOR_EDIT_TITLE}
            </h2>
          </EuiTitle>
          <EuiSpacer size="xs" />
          <EuiText
            size="xs"
            color="subdued"
            css={css`
              max-width: ${euiTheme.breakpoint.s}px;
            `}
          >
            {settingsI18n.EDITOR_HINT}
          </EuiText>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>{renderBody()}</EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty onClick={requestClose} data-test-subj="investigationTaskListCancel">
                {readOnly ? i18n.EDITOR_CLOSE : i18n.EDITOR_CANCEL}
              </EuiButtonEmpty>
            </EuiFlexItem>
            {readOnly ? null : (
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  isLoading={saveTaskList.isLoading}
                  isDisabled={!canSave || !loaded}
                  onClick={() => void handleSave()}
                  data-test-subj="investigationTaskListSave"
                >
                  {i18n.EDITOR_SAVE}
                </EuiButton>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlyoutFooter>
        <EuiScreenReaderOnly>
          <div role="status" aria-live="polite" data-test-subj="investigationTaskListAnnouncement">
            {announcement}
          </div>
        </EuiScreenReaderOnly>
      </EuiFlyout>
      {isDiscardOpen ? (
        <ConfirmModal
          title={i18n.EDITOR_DISCARD_TITLE}
          body={<p>{i18n.EDITOR_DISCARD_BODY}</p>}
          confirmLabel={i18n.EDITOR_DISCARD_CONFIRM}
          cancelLabel={i18n.EDITOR_KEEP_EDITING}
          destructive
          onConfirm={() => {
            setIsDiscardOpen(false);
            onClose();
          }}
          onCancel={() => setIsDiscardOpen(false)}
          data-test-subj="investigationTaskListDiscardModal"
        />
      ) : null}
    </>
  );
};
TaskListEditor.displayName = 'TaskListEditor';
