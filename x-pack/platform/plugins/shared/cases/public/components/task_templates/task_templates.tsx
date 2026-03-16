/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiDescribedFormGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import type { CaseTaskTemplate } from '../../../common/types/domain/task_template/v1';
import { useGetTaskTemplates } from '../../containers/use_get_task_templates';
import { useDeleteTaskTemplate } from '../../containers/use_delete_task_template';
import { useCasesContext } from '../cases_context/use_cases_context';
import * as i18n from '../configure_cases/translations';
import * as taskI18n from '../tasks/translations';

interface TaskTemplatesProps {
  disabled: boolean;
  isLoading: boolean;
  onAddTemplate: () => void;
  onEditTemplate: (template: CaseTaskTemplate) => void;
}

const TaskTemplatesComponent: React.FC<TaskTemplatesProps> = ({
  disabled,
  isLoading: isLoadingExternal,
  onAddTemplate,
  onEditTemplate,
}) => {
  const { permissions, owner } = useCasesContext();
  const canModify = !disabled && permissions.settings;

  const {
    data,
    isLoading: isLoadingTemplates,
  } = useGetTaskTemplates({ owners: owner });

  const { mutate: deleteTemplate } = useDeleteTaskTemplate();

  const templates = data?.templates ?? [];
  const isLoading = isLoadingExternal || isLoadingTemplates;

  const handleDelete = useCallback(
    (templateId: string) => {
      deleteTemplate(templateId);
    },
    [deleteTemplate]
  );

  if (!permissions.settings) {
    return null;
  }

  const columns: Array<EuiBasicTableColumn<CaseTaskTemplate>> = [
    {
      field: 'name',
      name: i18n.TASK_TEMPLATE_NAME,
      'data-test-subj': 'cases-task-templates-col-name',
    },
    {
      field: 'tasks',
      name: i18n.TASK_TEMPLATE_TASKS_COUNT,
      width: '80px',
      render: (tasks: CaseTaskTemplate['tasks']) => (
        <EuiText size="s">{tasks?.length ?? 0}</EuiText>
      ),
    },
    {
      name: taskI18n.TASK_ACTIONS,
      width: '100px',
      actions: [
        {
          name: i18n.EDIT_TASK_TEMPLATE,
          render: (row: CaseTaskTemplate) => (
            <EuiButtonEmpty
              iconType="pencil"
              size="xs"
              isDisabled={!canModify}
              onClick={() => onEditTemplate(row)}
              data-test-subj={`cases-task-template-edit-${row.id}`}
            >
              {i18n.EDIT_TASK_TEMPLATE}
            </EuiButtonEmpty>
          ),
        },
        {
          name: i18n.DELETE_TASK_TEMPLATE,
          render: (row: CaseTaskTemplate) => (
            <EuiButtonIcon
              iconType="trash"
              color="danger"
              size="xs"
              isDisabled={!canModify}
              aria-label={i18n.DELETE_TASK_TEMPLATE}
              onClick={() => handleDelete(row.id)}
              data-test-subj={`cases-task-template-delete-${row.id}`}
            />
          ),
        },
      ],
    },
  ];

  return (
    <EuiDescribedFormGroup
      fullWidth
      title={
        <EuiFlexGroup alignItems="center" gutterSize="none">
          <EuiFlexItem grow={false}>
            <h2>{i18n.TASK_TEMPLATES_TITLE}</h2>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      description={<p>{i18n.TASK_TEMPLATES_DESCRIPTION}</p>}
      data-test-subj="task-templates-form-group"
    >
      <EuiPanel paddingSize="s" color="subdued" hasBorder={false} hasShadow={false}>
        {templates.length === 0 && !isLoading ? (
          <EuiFlexGroup justifyContent="center">
            <EuiFlexItem grow={false} data-test-subj="cases-no-task-templates">
              <EuiText size="s">{i18n.NO_TASK_TEMPLATES}</EuiText>
              <EuiSpacer size="m" />
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          <EuiBasicTable<CaseTaskTemplate>
            items={templates}
            columns={columns}
            loading={isLoading}
            itemId="id"
            data-test-subj="cases-task-templates-table"
          />
        )}
        <EuiSpacer size="s" />
        <EuiFlexGroup justifyContent="center">
          <EuiFlexItem grow={false}>
            <EuiButton
              isLoading={isLoading}
              isDisabled={!canModify}
              size="s"
              iconType="plusInCircle"
              onClick={onAddTemplate}
              data-test-subj="cases-task-templates-add"
            >
              {i18n.ADD_TASK_TEMPLATE}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
      </EuiPanel>
    </EuiDescribedFormGroup>
  );
};

TaskTemplatesComponent.displayName = 'TaskTemplates';

export const TaskTemplates = React.memo(TaskTemplatesComponent);
