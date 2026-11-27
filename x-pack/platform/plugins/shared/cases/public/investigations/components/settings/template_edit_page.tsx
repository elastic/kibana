/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useParams } from 'react-router-dom';
import { SECURITY_SOLUTION_OWNER } from '../../../../common/constants';
import { INVESTIGATION_TYPE_TEMPLATE_TAG } from '../../../../common/investigations/template_fields';
import { useCasesContext } from '../../../components/cases_context/use_cases_context';
import type { YamlEditorFormValues } from '../../../components/templates_v2/components/template_form';
import { TemplateFormLayout } from '../../../components/templates_v2/components/template_form_layout';
import { useGetTemplate } from '../../../components/templates_v2/hooks/use_get_template';
import { useUpdateTemplate } from '../../../components/templates_v2/hooks/use_update_template';
import type { TemplateMetadata } from '../../../components/templates_v2/utils/template_metadata';
import { useInvestigationsNavigation, useRefreshInvestigationTemplates } from '../../hooks';
import { ICONS } from '../../icons';
import { EmptyState, ErrorState, LoadingState } from '../shared';
import { TEMPLATES_PATH } from './paths';
import { withInvestigationTag, withoutInvestigationTag } from './template_tags';
import { EDIT_DRAFT_KEY } from './template_form_shared';
import { TemplateTaskListsSection } from './template_task_lists_section';
import { useTemplateBreadcrumbs } from './use_template_breadcrumbs';
import * as i18n from './translations';

/**
 * `/settings/templates/:templateId`: the Cases template editor on an existing investigation
 * template. Saving makes a new version of the template, as it does in Cases, and the tag that
 * marks it as an investigation template stays on it.
 */
export const TemplateEditPage: React.FC = () => {
  const { templateId } = useParams<{ templateId: string }>();
  const { permissions } = useCasesContext();
  const { navigate, getHref } = useInvestigationsNavigation();
  const refreshTemplates = useRefreshInvestigationTemplates();
  const {
    data: template,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetTemplate(templateId, undefined, { silent: true });
  const { mutateAsync, isLoading: isSaving } = useUpdateTemplate();

  useTemplateBreadcrumbs(template?.name ?? i18n.EDIT_TEMPLATE);

  const serverDefinition = useMemo(() => template?.definitionString.trimEnd() ?? '', [template]);
  const form = useForm<YamlEditorFormValues>({ defaultValues: { definition: serverDefinition } });

  const initialMetadata = useMemo<TemplateMetadata>(
    () => ({
      name: template?.name ?? '',
      description: template?.description ?? '',
      tags: withoutInvestigationTag(template?.tags),
    }),
    [template?.name, template?.description, template?.tags]
  );

  const back = useMemo(
    () => ({
      href: getHref(TEMPLATES_PATH),
      label: i18n.BACK_TO_TEMPLATES,
      onClick: (event: React.MouseEvent) => {
        event.preventDefault();
        navigate(TEMPLATES_PATH);
      },
    }),
    [getHref, navigate]
  );

  const handleSave = useCallback(
    async (data: YamlEditorFormValues, metadata: TemplateMetadata, isEnabled: boolean) => {
      if (!template) {
        return;
      }
      await mutateAsync({
        templateId: template.templateId,
        template: {
          name: metadata.name,
          description: metadata.description,
          tags: withInvestigationTag(metadata.tags),
          definition: data.definition,
          isEnabled,
        },
      });
      await refreshTemplates();
    },
    [mutateAsync, refreshTemplates, template]
  );

  if (!permissions.manageTemplates) {
    return (
      <EmptyState
        iconType={ICONS.lock}
        title={i18n.NO_TEMPLATE_PERMISSION_TITLE}
        body={i18n.TEMPLATES_NO_PERMISSION}
        data-test-subj="investigationTemplateNoPermission"
      />
    );
  }
  if (isLoading) {
    return <LoadingState label={i18n.TEMPLATES_LOADING} />;
  }
  if (isError || !template) {
    return (
      <ErrorState title={i18n.TEMPLATE_LOAD_ERROR} error={error} onRetry={() => void refetch()} />
    );
  }
  if (
    template.owner !== SECURITY_SOLUTION_OWNER ||
    !(template.tags ?? []).includes(INVESTIGATION_TYPE_TEMPLATE_TAG)
  ) {
    return (
      <EmptyState
        iconType={ICONS.warning}
        title={i18n.TEMPLATE_NOT_INVESTIGATION}
        data-test-subj="investigationTemplateNotInvestigation"
      />
    );
  }

  return (
    <div data-test-subj="investigationTemplateEditPage">
      <TemplateFormLayout
        key={template.templateId}
        form={form}
        initialMetadata={initialMetadata}
        isSaving={isSaving}
        onCreate={handleSave}
        isEdit
        storageKey={EDIT_DRAFT_KEY}
        initialValue={serverDefinition}
        templateId={template.templateId}
        initialIsEnabled={template.isEnabled}
        back={back}
        belowHeader={
          <TemplateTaskListsSection templateId={template.templateId} templateName={template.name} />
        }
      />
    </div>
  );
};
TemplateEditPage.displayName = 'TemplateEditPage';
