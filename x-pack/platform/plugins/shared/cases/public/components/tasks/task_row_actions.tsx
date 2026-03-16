/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButtonIcon,
  EuiConfirmModal,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { CaseTask, CaseTaskStatus } from '../../../common/types/domain/task/v1';
import { useCasesContext } from '../cases_context/use_cases_context';
import { useDeleteTask, useUpdateTask } from '../../containers/use_case_tasks';
import * as i18n from './translations';

export interface TaskRowActionsProps {
  caseId: string;
  task: CaseTask;
  subtaskCount: number;
  onEdit: (task: CaseTask) => void;
  onAddSubtask: (task: CaseTask) => void;
}

export const TaskRowActions: React.FC<TaskRowActionsProps> = ({
  caseId,
  task,
  subtaskCount,
  onEdit,
  onAddSubtask,
}) => {
  const { permissions } = useCasesContext();
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const modalTitleId = useGeneratedHtmlId();
  const { mutate: updateTask } = useUpdateTask(caseId);
  const { mutateAsync: deleteTask, isLoading: isDeleteLoading } = useDeleteTask(caseId);

  const setStatus = (status: CaseTaskStatus) => {
    setIsOpen(false);
    updateTask({ taskId: task.id, request: { version: task.version, status } });
  };

  const items = [
    permissions.update && (
      <EuiContextMenuItem key="edit" icon="pencil" onClick={() => (setIsOpen(false), onEdit(task))}>
        {i18n.EDIT_TASK}
      </EuiContextMenuItem>
    ),
    permissions.update && task.parent_task_id === null && (
      <EuiContextMenuItem
        key="subtask"
        icon="branch"
        onClick={() => (setIsOpen(false), onAddSubtask(task))}
      >
        {i18n.ADD_SUBTASK}
      </EuiContextMenuItem>
    ),
    permissions.update && task.status === 'open' && (
      <EuiContextMenuItem key="progress" icon="play" onClick={() => setStatus('in_progress')}>
        {i18n.MARK_IN_PROGRESS}
      </EuiContextMenuItem>
    ),
    permissions.update && (task.status === 'open' || task.status === 'in_progress') && (
      <EuiContextMenuItem key="cancel" icon="cross" onClick={() => setStatus('cancelled')}>
        {i18n.CANCEL_TASK}
      </EuiContextMenuItem>
    ),
    permissions.update && (task.status === 'completed' || task.status === 'cancelled') && (
      <EuiContextMenuItem key="reopen" icon="refresh" onClick={() => setStatus('open')}>
        {i18n.REOPEN_TASK}
      </EuiContextMenuItem>
    ),
    permissions.delete && (
      <EuiContextMenuItem
        key="delete"
        icon="trash"
        css={({ euiTheme }) => ({ color: euiTheme.colors.textDanger })}
        onClick={() => (setIsOpen(false), setIsDeleting(true))}
        data-test-subj="cases-task-delete"
      >
        {i18n.DELETE_TASK}
      </EuiContextMenuItem>
    ),
  ].filter((item): item is React.ReactElement => Boolean(item));

  if (items.length === 0) {
    return null;
  }

  return (
    <>
      <EuiPopover
        isOpen={isOpen}
        closePopover={() => setIsOpen(false)}
        panelPaddingSize="none"
        anchorPosition="downRight"
        aria-label={i18n.TASK_ACTIONS_ARIA(task.title)}
        button={
          <EuiToolTip content={i18n.COLUMN_ACTIONS} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType="boxesHorizontal"
              aria-label={i18n.TASK_ACTIONS_ARIA(task.title)}
              onClick={() => setIsOpen((open) => !open)}
              data-test-subj={`cases-task-actions-${task.id}`}
            />
          </EuiToolTip>
        }
      >
        <EuiContextMenuPanel items={items} />
      </EuiPopover>
      {isDeleting && (
        <EuiConfirmModal
          aria-labelledby={modalTitleId}
          titleProps={{ id: modalTitleId }}
          title={i18n.DELETE_TASK_TITLE(task.title)}
          buttonColor="danger"
          cancelButtonText={i18n.CANCEL}
          confirmButtonText={i18n.DELETE_TASK}
          isLoading={isDeleteLoading}
          onCancel={() => setIsDeleting(false)}
          onConfirm={async () => {
            await deleteTask(task.id);
            setIsDeleting(false);
          }}
          data-test-subj="cases-task-delete-modal"
        >
          {i18n.DELETE_TASK_BODY(subtaskCount)}
        </EuiConfirmModal>
      )}
    </>
  );
};

TaskRowActions.displayName = 'TaskRowActions';
