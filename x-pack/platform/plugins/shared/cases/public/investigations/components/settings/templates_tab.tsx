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
import type { TemplateListItem } from '../../../../common/types/api/template/v1';
import { useCasesContext } from '../../../components/cases_context/use_cases_context';
import { useUpdateTemplate } from '../../../components/templates_v2/hooks/use_update_template';
import {
  useInvestigationTemplates,
  useInvestigationToasts,
  useInvestigationTypes,
  useInvestigationsNavigation,
  useRefreshInvestigationTemplates,
  useTaskLists,
} from '../../hooks';
import { ICONS } from '../../icons';
import { ConfirmModal, EmptyState, ErrorState, LoadingState } from '../shared';
import { GlobalFieldsSection } from './global_fields_section';
import { NEW_TEMPLATE_PATH, getTemplatePath } from './paths';
import { LinkedTaskListBadges } from './linked_task_list_badges';
import { TemplateTaskListsPicker } from './template_task_lists_picker';
import * as i18n from './translations';

/**
 * The investigation templates of the space: Cases templates tagged `investigation-type`. Creating
 * and editing a template opens the Cases template editor inside this app; the task lists a
 * template adds are chosen here too.
 */
export const TemplatesTab: React.FC = () => {
  const { permissions } = useCasesContext();
  const { navigate, getHref } = useInvestigationsNavigation();
  const { showSuccess, showError } = useInvestigationToasts();
  const templatesQuery = useInvestigationTemplates();
  const typesQuery = useInvestigationTypes();
  const taskListsQuery = useTaskLists();
  const refreshTemplates = useRefreshInvestigationTemplates();
  const { mutate: updateTemplate, isLoading: isUpdating } = useUpdateTemplate({
    disableDefaultSuccessToast: true,
  });
  const [templateToDisable, setTemplateToDisable] = useState<TemplateListItem | null>(null);
  const [templateForTaskLists, setTemplateForTaskLists] = useState<TemplateListItem | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const canManage = permissions.manageTemplates;
  const templates = useMemo(() => templatesQuery.data?.templates ?? [], [templatesQuery.data]);
  const linkedIds = useMemo(
    () =>
      new Map((typesQuery.data?.types ?? []).map((type) => [type.template_id, type.task_list_ids])),
    [typesQuery.data]
  );
  const taskLists = useMemo(() => taskListsQuery.data?.task_lists ?? [], [taskListsQuery.data]);

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
      name: i18n.COLUMN_TASK_LISTS,
      width: '220px',
      render: (template: TemplateListItem) => {
        const ids = linkedIds.get(template.templateId);
        if (!ids) {
          return (
            <EuiToolTip content={i18n.TASK_LISTS_UNAVAILABLE}>
              <span
                tabIndex={0}
                data-test-subj={`investigationTemplateTaskLists-${template.templateId}`}
              >
                {'-'}
              </span>
            </EuiToolTip>
          );
        }
        return (
          <LinkedTaskListBadges
            taskListIds={ids}
            taskLists={taskLists}
            data-test-subj={`investigationTemplateTaskLists-${template.templateId}`}
          />
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
              <EuiButtonEmpty
                size="xs"
                iconType={ICONS.procedure}
                aria-label={i18n.TASK_LISTS_BUTTON_ARIA(template.name)}
                onClick={() => setTemplateForTaskLists(template)}
                data-test-subj={`investigationTemplateEditTasks-${template.templateId}`}
              >
                {i18n.TASK_LISTS_BUTTON}
              </EuiButtonEmpty>
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
    // The Task lists column needs the template links and the lists; rendering rows before both
    // arrive shows "-" or "None" for templates that do have lists.
    if (templatesQuery.isLoading || typesQuery.isLoading || taskListsQuery.isLoading) {
      return <LoadingState label={i18n.TEMPLATES_LOADING} />;
    }
    // The Task lists column depends on all three, so any failure is shown instead of a table of "-".
    const failed = [templatesQuery, typesQuery, taskListsQuery].filter((query) => query.isError);
    if (failed.length > 0) {
      return (
        <ErrorState
          title={i18n.TEMPLATES_LOAD_ERROR}
          error={failed[0].error}
          onRetry={() => failed.forEach((query) => void query.refetch())}
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
      <EuiSpacer size="xl" />
      <GlobalFieldsSection />
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
      {templateForTaskLists ? (
        <TemplateTaskListsPicker
          key={templateForTaskLists.templateId}
          templateId={templateForTaskLists.templateId}
          templateName={templateForTaskLists.name}
          onClose={() => setTemplateForTaskLists(null)}
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
