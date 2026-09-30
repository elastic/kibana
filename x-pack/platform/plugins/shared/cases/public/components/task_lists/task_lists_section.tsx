/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { MAX_TASK_TEMPLATES_PER_OWNER } from '../../../common/constants';
import type { CaseTaskTemplate } from '../../../common/types/domain/task_template/v1';
import { useDeleteTaskTemplate, useGetTaskTemplates } from '../../containers/use_case_tasks';
import { useCasesContext } from '../cases_context/use_cases_context';
import { DeleteConfirmationModal } from '../configure_cases/delete_confirmation_modal';
import { TaskListFlyout } from './task_list_flyout';
import * as i18n from './translations';

type Dialog =
  | { kind: 'add' }
  | { kind: 'edit'; template: CaseTaskTemplate }
  | { kind: 'delete'; template: CaseTaskTemplate }
  | null;

const countTasks = (template: CaseTaskTemplate) =>
  template.tasks.reduce((count, task) => count + 1 + task.subtasks.length, 0);

/** Settings-page section listing the reusable task lists of the current solution. */
export const TaskListsSection: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const { permissions } = useCasesContext();
  const { data, isLoading } = useGetTaskTemplates();
  const { mutateAsync: deleteTaskTemplate } = useDeleteTaskTemplate();
  const [dialog, setDialog] = useState<Dialog>(null);
  const closeDialog = () => setDialog(null);

  const templates = data?.templates ?? [];
  const canEdit = permissions.settings;

  const rowCss = css`
    padding: ${euiTheme.size.s} 0;
    border-bottom: ${euiTheme.border.thin};
  `;

  return (
    <div data-test-subj="cases-task-lists-section">
      {isLoading ? (
        <EuiSkeletonText lines={2} />
      ) : templates.length === 0 ? (
        <EuiText size="s" color="subdued" data-test-subj="cases-task-lists-empty">
          {i18n.NO_TASK_LISTS}
        </EuiText>
      ) : (
        templates.map((template) => (
          <EuiFlexGroup
            key={template.id}
            alignItems="center"
            gutterSize="s"
            responsive={false}
            css={rowCss}
            data-test-subj={`cases-task-list-row-${template.id}`}
          >
            <EuiFlexItem>
              <EuiText size="s">{template.name}</EuiText>
              {template.description && (
                <EuiText size="xs" color="subdued">
                  {template.description}
                </EuiText>
              )}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {i18n.TASK_COUNT(countTasks(template))}
              </EuiText>
            </EuiFlexItem>
            {template.tags.map((tag) => (
              <EuiFlexItem grow={false} key={tag}>
                <EuiBadge color="hollow">{tag}</EuiBadge>
              </EuiFlexItem>
            ))}
            {canEdit && (
              <>
                <EuiFlexItem grow={false}>
                  <EuiToolTip content={i18n.EDIT_TASK_LIST} disableScreenReaderOutput>
                    <EuiButtonIcon
                      iconType="pencil"
                      aria-label={i18n.EDIT_ARIA(template.name)}
                      onClick={() => setDialog({ kind: 'edit', template })}
                      data-test-subj={`cases-task-list-edit-${template.id}`}
                    />
                  </EuiToolTip>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiToolTip content={i18n.DELETE_TASK_LIST} disableScreenReaderOutput>
                    <EuiButtonIcon
                      iconType="minusCircle"
                      color="danger"
                      aria-label={i18n.DELETE_ARIA(template.name)}
                      onClick={() => setDialog({ kind: 'delete', template })}
                      data-test-subj={`cases-task-list-delete-${template.id}`}
                    />
                  </EuiToolTip>
                </EuiFlexItem>
              </>
            )}
          </EuiFlexGroup>
        ))
      )}
      <EuiSpacer size="s" />
      {canEdit && (
        <EuiFlexGroup justifyContent="center">
          <EuiFlexItem grow={false}>
            {templates.length < MAX_TASK_TEMPLATES_PER_OWNER ? (
              <EuiButtonEmpty
                size="s"
                iconType="plusCircle"
                onClick={() => setDialog({ kind: 'add' })}
                data-test-subj="cases-task-lists-add"
              >
                {i18n.ADD_TASK_LIST}
              </EuiButtonEmpty>
            ) : (
              <EuiText size="s">{i18n.MAX_TASK_LISTS(MAX_TASK_TEMPLATES_PER_OWNER)}</EuiText>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
      {dialog?.kind === 'add' && <TaskListFlyout onClose={closeDialog} />}
      {dialog?.kind === 'edit' && (
        <TaskListFlyout template={dialog.template} onClose={closeDialog} />
      )}
      {dialog?.kind === 'delete' && (
        <DeleteConfirmationModal
          title={i18n.DELETE_TITLE(dialog.template.name)}
          message={i18n.DELETE_BODY}
          onCancel={closeDialog}
          onConfirm={async () => {
            await deleteTaskTemplate(dialog.template.id);
            closeDialog();
          }}
        />
      )}
    </div>
  );
};

TaskListsSection.displayName = 'TaskListsSection';
