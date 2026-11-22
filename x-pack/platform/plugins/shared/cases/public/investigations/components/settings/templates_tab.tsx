/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { css } from '@emotion/react';
import type { ProcedureTemplate } from '../../../../common/investigations/types';
import type { TemplateListItem } from '../../../../common/types/api/template/v1';
import { useCasesContext } from '../../../components/cases_context/use_cases_context';
import { useUpdateTemplate } from '../../../components/templates_v2/hooks/use_update_template';
import {
  useInvestigationTemplates,
  useInvestigationToasts,
  useInvestigationsNavigation,
  useProcedureTemplates,
  useRefreshInvestigationTemplates,
} from '../../hooks';
import { ICONS } from '../../icons';
import { ConfirmModal, EmptyState, ErrorState, LoadingState, RelativeTime } from '../shared';
import { NEW_TEMPLATE_PATH, TEMPLATES_PATH, getTaskListPath, getTemplatePath } from './paths';
import { TaskListEditor } from './task_list_editor';
import * as i18n from './translations';

export interface TemplatesTabProps {
  /** Opens the task list editor for this template (the `/settings/templates/:id/tasks` route). */
  taskListTemplateId?: string;
}

/** A template's task count: its tasks and their sub-tasks. */
const countTasks = (procedure: ProcedureTemplate): number =>
  procedure.tasks.reduce((total, task) => total + 1 + (task.subtasks?.length ?? 0), 0);

/**
 * The investigation templates of the space: Cases templates tagged `investigation-type`. Creating
 * and editing a template opens the Cases template editor inside this app; the task list of a
 * template is edited here too.
 */
export const TemplatesTab: React.FC<TemplatesTabProps> = ({ taskListTemplateId }) => {
  const { permissions } = useCasesContext();
  const { navigate, getHref } = useInvestigationsNavigation();
  const { showSuccess, showError } = useInvestigationToasts();
  const templatesQuery = useInvestigationTemplates();
  const procedureQuery = useProcedureTemplates();
  const refreshTemplates = useRefreshInvestigationTemplates();
  const { mutate: updateTemplate, isLoading: isUpdating } = useUpdateTemplate({
    disableDefaultSuccessToast: true,
  });
  const [templateToDisable, setTemplateToDisable] = useState<TemplateListItem | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const canManage = permissions.manageTemplates;
  const templates = useMemo(() => templatesQuery.data?.templates ?? [], [templatesQuery.data]);
  const procedures = useMemo(
    () =>
      new Map(
        (procedureQuery.data?.templates ?? []).map((procedure) => [
          procedure.template_id,
          procedure,
        ])
      ),
    [procedureQuery.data]
  );

  const setEnabled = useCallback(
    (template: TemplateListItem, isEnabled: boolean) => {
      setBusyId(template.templateId);
      updateTemplate(
        { templateId: template.templateId, template: { isEnabled } },
        {
          onSuccess: () => {
            void refreshTemplates();
            showSuccess(
              isEnabled
                ? i18n.TEMPLATE_ENABLED_TOAST(template.name)
                : i18n.TEMPLATE_DISABLED_TOAST(template.name)
            );
          },
          onError: (error) => showError(error, i18n.TEMPLATE_TOGGLE_ERROR),
          onSettled: () => setBusyId(null),
        }
      );
    },
    [refreshTemplates, showError, showSuccess, updateTemplate]
  );

  const columns: Array<EuiBasicTableColumn<TemplateListItem>> = [
    {
      field: 'name',
      name: i18n.COLUMN_NAME,
      width: '200px',
      render: (name: string, template) =>
        canManage ? (
          <EuiLink
            href={getHref(getTemplatePath(template.templateId))}
            onClick={(event: React.MouseEvent) => {
              event.preventDefault();
              navigate(getTemplatePath(template.templateId));
            }}
            data-test-subj={`investigationTemplateName-${template.templateId}`}
          >
            {name}
          </EuiLink>
        ) : (
          <span data-test-subj={`investigationTemplateName-${template.templateId}`}>{name}</span>
        ),
    },
    {
      field: 'description',
      name: i18n.COLUMN_DESCRIPTION,
      render: (description: string | undefined) =>
        description ? (
          <EuiText size="s" css={clampStyles}>
            {description}
          </EuiText>
        ) : (
          <EuiText size="s" color="subdued">
            {i18n.NO_DESCRIPTION}
          </EuiText>
        ),
    },
    {
      field: 'fieldCount',
      name: i18n.COLUMN_FIELDS,
      width: '80px',
      align: 'right',
      render: (count: number | undefined, template) => (
        <span data-test-subj={`investigationTemplateFields-${template.templateId}`}>
          {count ?? 0}
        </span>
      ),
    },
    {
      name: i18n.COLUMN_TASKS,
      width: '80px',
      align: 'right',
      render: (template: TemplateListItem) => {
        const procedure = procedures.get(template.templateId);
        if (!procedure) {
          return (
            <EuiToolTip content={i18n.TASKS_UNAVAILABLE}>
              <span
                tabIndex={0}
                data-test-subj={`investigationTemplateTasks-${template.templateId}`}
              >
                {'-'}
              </span>
            </EuiToolTip>
          );
        }
        return (
          <span data-test-subj={`investigationTemplateTasks-${template.templateId}`}>
            {countTasks(procedure)}
          </span>
        );
      },
    },
    {
      field: 'templateVersion',
      name: i18n.COLUMN_VERSION,
      width: '80px',
      render: (version: number) => i18n.VERSION_VALUE(version),
    },
    {
      name: i18n.COLUMN_UPDATED,
      width: '140px',
      render: (template: TemplateListItem) => {
        const procedure = procedures.get(template.templateId);
        if (!procedure) {
          return '-';
        }
        return procedure.updated_at ? (
          <RelativeTime value={procedure.updated_at} />
        ) : (
          <EuiText size="s" color="subdued">
            {i18n.BUILT_IN_TASK_LIST}
          </EuiText>
        );
      },
    },
    {
      field: 'isEnabled',
      name: i18n.COLUMN_ENABLED,
      width: '100px',
      render: (isEnabled: boolean | undefined, template) => (
        <EuiBadge
          color={isEnabled === false ? 'default' : 'success'}
          data-test-subj={`investigationTemplateEnabled-${template.templateId}`}
        >
          {isEnabled === false ? i18n.DISABLED_BADGE : i18n.ENABLED_BADGE}
        </EuiBadge>
      ),
    },
    {
      name: i18n.COLUMN_ACTIONS,
      width: '330px',
      render: (template: TemplateListItem) => {
        const isEnabled = template.isEnabled !== false;
        const hasTaskList = procedures.has(template.templateId);
        return (
          <EuiFlexGroup gutterSize="xs" responsive={false} wrap={false}>
            {canManage ? (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="xs"
                  iconType={ICONS.edit}
                  aria-label={i18n.EDIT_TEMPLATE_ARIA(template.name)}
                  onClick={() => navigate(getTemplatePath(template.templateId))}
                  data-test-subj={`investigationTemplateEdit-${template.templateId}`}
                >
                  {i18n.EDIT_TEMPLATE}
                </EuiButtonEmpty>
              </EuiFlexItem>
            ) : null}
            <EuiFlexItem grow={false}>
              <EuiToolTip content={hasTaskList ? undefined : i18n.TASKS_UNAVAILABLE}>
                <EuiButtonEmpty
                  size="xs"
                  iconType={ICONS.procedure}
                  aria-label={i18n.EDIT_TASK_LIST_ARIA(template.name)}
                  isDisabled={!hasTaskList}
                  onClick={() => navigate(getTaskListPath(template.templateId))}
                  data-test-subj={`investigationTemplateEditTasks-${template.templateId}`}
                >
                  {i18n.EDIT_TASK_LIST}
                </EuiButtonEmpty>
              </EuiToolTip>
            </EuiFlexItem>
            {canManage ? (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="xs"
                  color={isEnabled ? 'danger' : 'primary'}
                  aria-label={
                    isEnabled
                      ? i18n.DISABLE_TEMPLATE_ARIA(template.name)
                      : i18n.ENABLE_TEMPLATE_ARIA(template.name)
                  }
                  isLoading={isUpdating && busyId === template.templateId}
                  isDisabled={isUpdating}
                  onClick={() =>
                    isEnabled ? setTemplateToDisable(template) : setEnabled(template, true)
                  }
                  data-test-subj={`investigationTemplateToggle-${template.templateId}`}
                >
                  {isEnabled ? i18n.DISABLE_TEMPLATE : i18n.ENABLE_TEMPLATE}
                </EuiButtonEmpty>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        );
      },
    },
  ];

  const renderTable = () => {
    if (templatesQuery.isLoading || (procedureQuery.isLoading && templates.length === 0)) {
      return <LoadingState label={i18n.TEMPLATES_LOADING} />;
    }
    if (templatesQuery.isError) {
      return (
        <ErrorState
          title={i18n.TEMPLATES_LOAD_ERROR}
          error={templatesQuery.error}
          onRetry={() => void templatesQuery.refetch()}
        />
      );
    }
    if (templates.length === 0) {
      return (
        <EmptyState
          iconType={ICONS.template}
          title={i18n.TEMPLATES_EMPTY_TITLE}
          body={i18n.TEMPLATES_EMPTY_BODY}
          actions={
            canManage ? (
              <EuiButton
                fill
                iconType={ICONS.add}
                onClick={() => navigate(NEW_TEMPLATE_PATH)}
                data-test-subj="investigationTemplatesEmptyCreate"
              >
                {i18n.CREATE_TEMPLATE}
              </EuiButton>
            ) : undefined
          }
          data-test-subj="investigationTemplatesEmpty"
        />
      );
    }
    return (
      <EuiBasicTable
        tableCaption={i18n.TEMPLATES_TABLE_CAPTION}
        items={templates}
        itemId="templateId"
        columns={columns}
        loading={templatesQuery.isFetching}
        rowProps={(template) => ({
          'data-test-subj': `investigationTemplateRow-${template.templateId}`,
        })}
        data-test-subj="investigationTemplatesTable"
      />
    );
  };

  return (
    <div data-test-subj="investigationTemplatesTab">
      <EuiFlexGroup alignItems="flexStart" gutterSize="m" responsive={false} wrap>
        <EuiFlexItem>
          <EuiTitle size="s">
            <h2>{i18n.TEMPLATES_TITLE}</h2>
          </EuiTitle>
          <EuiText size="s" color="subdued">
            <p>{i18n.TEMPLATES_DESCRIPTION}</p>
          </EuiText>
        </EuiFlexItem>
        {canManage ? (
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              iconType={ICONS.add}
              onClick={() => navigate(NEW_TEMPLATE_PATH)}
              data-test-subj="investigationTemplatesCreate"
            >
              {i18n.CREATE_TEMPLATE}
            </EuiButton>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      {canManage ? null : (
        <>
          <EuiCallOut
            announceOnMount={false}
            size="s"
            iconType={ICONS.lock}
            title={i18n.TEMPLATES_NO_PERMISSION}
            data-test-subj="investigationTemplatesReadOnly"
          />
          <EuiSpacer size="m" />
        </>
      )}
      {renderTable()}
      {templateToDisable ? (
        <ConfirmModal
          title={i18n.DISABLE_TEMPLATE_TITLE(templateToDisable.name)}
          body={<p>{i18n.DISABLE_TEMPLATE_BODY}</p>}
          confirmLabel={i18n.DISABLE_TEMPLATE}
          destructive
          onConfirm={() => {
            const template = templateToDisable;
            setTemplateToDisable(null);
            setEnabled(template, false);
          }}
          onCancel={() => setTemplateToDisable(null)}
          data-test-subj="investigationTemplateDisableModal"
        />
      ) : null}
      {taskListTemplateId ? (
        <TaskListEditor
          key={taskListTemplateId}
          templateId={taskListTemplateId}
          onClose={() => navigate(TEMPLATES_PATH)}
        />
      ) : null}
    </div>
  );
};
TemplatesTab.displayName = 'TemplatesTab';

const clampStyles = css`
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;
