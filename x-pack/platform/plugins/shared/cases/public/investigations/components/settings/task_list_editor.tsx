/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiDragDropContext,
  EuiDraggable,
  EuiDroppable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiIcon,
  EuiScreenReaderOnly,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { DropResult } from '@elastic/eui';
import { css } from '@emotion/react';
import { useCasesContext } from '../../../components/cases_context/use_cases_context';
import {
  getHttpErrorMessage,
  getHttpErrorStatus,
  useInvestigationToasts,
  useProcedureTemplates,
} from '../../hooks';
import { useSaveProcedureTemplate, useWorkflowList } from '../../hooks/use_tasks';
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

export interface TaskListEditorProps {
  /** Cases template id of the investigation template whose task list is edited. */
  templateId: string;
  onClose: () => void;
}

/**
 * Edits the reusable task list of one investigation template, with the built-in default shown
 * until a list is saved.
 */
export const TaskListEditor: React.FC<TaskListEditorProps> = ({ templateId, onClose }) => {
  const flyoutTitleId = useGeneratedHtmlId();
  const { euiTheme } = useEuiTheme();
  const { showSuccess } = useInvestigationToasts();
  const { permissions } = useCasesContext();
  const templatesQuery = useProcedureTemplates();
  const workflowsQuery = useWorkflowList();
  const saveTemplate = useSaveProcedureTemplate();

  const counter = useRef(0);
  const nextKey = useCallback(() => {
    counter.current += 1;
    return createDraftKey(counter.current);
  }, []);

  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState<DraftTask[]>([]);
  const [baseline, setBaseline] = useState('[]');
  const [showErrors, setShowErrors] = useState(false);
  const [isDiscardOpen, setIsDiscardOpen] = useState(false);
  const [isForbidden, setIsForbidden] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');

  const templates = templatesQuery.data?.templates;
  const readOnly = !permissions.settings || isForbidden;

  const selected = templates?.find((template) => template.template_id === templateId);

  // Load the draft once, not on every refetch of the lists.
  useEffect(() => {
    if (!selected || loaded) {
      return;
    }
    const initial = toDraft(selected.tasks, nextKey);
    setDraft(initial);
    setBaseline(serializeDraft(initial));
    setLoaded(true);
  }, [selected, loaded, nextKey]);

  const isDirty = serializeDraft(draft) !== baseline;
  const errors = useMemo(() => validateDraft(draft), [draft]);
  const totalTasks = countDraftTasks(draft);
  const hasErrors = Object.keys(errors).length > 0 || totalTasks > MAX_TEMPLATE_TASKS;
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
    if (hasErrors || !selected) {
      return;
    }
    try {
      await saveTemplate.mutateAsync({ templateId, tasks: toTemplateTasks(draft) });
      showSuccess(i18n.EDITOR_SAVED(selected.type));
      setBaseline(serializeDraft(draft));
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
    if (templatesQuery.isLoading) {
      return <LoadingState label={i18n.EDITOR_LOADING} />;
    }
    if (templatesQuery.error || !templates) {
      return (
        <ErrorState
          title={i18n.EDITOR_LOAD_ERROR}
          error={templatesQuery.error}
          onRetry={() => void templatesQuery.refetch()}
        />
      );
    }
    if (!selected) {
      return (
        <EuiCallOut
          announceOnMount
          color="warning"
          size="s"
          title={settingsI18n.TASK_LIST_UNAVAILABLE_TITLE}
          text={<p>{settingsI18n.TASK_LIST_UNAVAILABLE_BODY}</p>}
          data-test-subj="investigationTemplateUnavailable"
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
              data-test-subj="investigationTemplateReadOnly"
            />
            <EuiSpacer size="m" />
          </>
        ) : null}
        {draft.length === 0 ? (
          <EuiText size="s" color="subdued" data-test-subj="investigationTemplateEmpty">
            <p>{i18n.EDITOR_NO_TASKS}</p>
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
            data-test-subj="investigationTemplateAddTask"
          >
            {i18n.EDITOR_ADD_TASK}
          </EuiButtonEmpty>
        )}
        {isFull ? (
          <EuiText size="xs" color="subdued" data-test-subj="investigationTemplateMaxTasks">
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
              data-test-subj="investigationTemplateSaveError"
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
              data-test-subj="investigationTemplateErrors"
            />
          </>
        ) : null}
      </>
    );
  };

  return (
    <>
      <EuiFlyout
        onClose={requestClose}
        size="l"
        ownFocus
        aria-labelledby={flyoutTitleId}
        data-test-subj="investigationTemplateEditor"
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2 id={flyoutTitleId}>{settingsI18n.TASK_LIST_TITLE}</h2>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiFlexGroup gutterSize="s" alignItems="center" wrap responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="s" data-test-subj="investigationTemplateName">
                <strong>{selected?.type ?? ''}</strong>
              </EuiText>
            </EuiFlexItem>
            {selected ? (
              <EuiFlexItem grow={false}>
                <EuiBadge
                  color={selected.saved ? 'success' : 'hollow'}
                  data-test-subj="investigationTemplateSavedBadge"
                >
                  {selected.saved ? i18n.EDITOR_SAVED_BADGE : i18n.EDITOR_DEFAULT_BADGE}
                </EuiBadge>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
          <EuiSpacer size="xs" />
          <EuiText
            size="xs"
            color="subdued"
            css={css`
              max-width: ${euiTheme.breakpoint.s}px;
            `}
          >
            {settingsI18n.TASK_LIST_HINT}
          </EuiText>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>{renderBody()}</EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty onClick={requestClose} data-test-subj="investigationTemplateCancel">
                {readOnly ? i18n.EDITOR_CLOSE : i18n.EDITOR_CANCEL}
              </EuiButtonEmpty>
            </EuiFlexItem>
            {readOnly ? null : (
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  isLoading={saveTemplate.isLoading}
                  isDisabled={!selected}
                  onClick={() => void handleSave()}
                  data-test-subj="investigationTemplateSave"
                >
                  {i18n.EDITOR_SAVE}
                </EuiButton>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlyoutFooter>
        <EuiScreenReaderOnly>
          <div role="status" aria-live="polite" data-test-subj="investigationTemplateAnnouncement">
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
          data-test-subj="investigationTemplateDiscardModal"
        />
      ) : null}
    </>
  );
};
TaskListEditor.displayName = 'TaskListEditor';
