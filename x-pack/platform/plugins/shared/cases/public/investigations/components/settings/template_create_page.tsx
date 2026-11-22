/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { SECURITY_SOLUTION_OWNER } from '../../../../common/constants';
import { getCaseSettings } from '../../../../common/utils/case_settings';
import type { TemplateSettings } from '../../../../common/types/domain/template/v1';
import { useCasesContext } from '../../../components/cases_context/use_cases_context';
import type { YamlEditorFormValues } from '../../../components/templates_v2/components/template_form';
import { TemplateFormLayout } from '../../../components/templates_v2/components/template_form_layout';
import { exampleTemplateDefinition } from '../../../components/templates_v2/field_types/constants';
import { useCreateTemplate } from '../../../components/templates_v2/hooks/use_create_template';
import type { TemplateMetadata } from '../../../components/templates_v2/utils/template_metadata';
import { useInvestigationsNavigation, useRefreshInvestigationTemplates } from '../../hooks';
import { EmptyState } from '../shared';
import { TEMPLATES_PATH, getTemplatePath } from './paths';
import { withInvestigationTag } from './template_tags';
import { CREATE_DRAFT_KEY } from './template_form_shared';
import { useTemplateBreadcrumbs } from './use_template_breadcrumbs';
import { ICONS } from '../../icons';
import * as i18n from './translations';

const INITIAL_METADATA: TemplateMetadata = { name: '', description: '', tags: [] };

/**
 * `/settings/templates/new`: the Cases template editor (YAML editor with live preview), creating a
 * template of the investigations owner that carries the investigation template tag.
 */
export const TemplateCreatePage: React.FC = () => {
  const { permissions } = useCasesContext();
  const { navigate, getHref } = useInvestigationsNavigation();
  const refreshTemplates = useRefreshInvestigationTemplates();
  const { mutateAsync, isLoading: isSaving } = useCreateTemplate();

  useTemplateBreadcrumbs(i18n.NEW_TEMPLATE_BREADCRUMB);

  const form = useForm<YamlEditorFormValues>({
    defaultValues: { definition: exampleTemplateDefinition },
  });

  // New templates start with the case settings the owner turns on by default.
  const initialSettings = useMemo<TemplateSettings>(() => {
    const { syncAlerts, extractObservables } = getCaseSettings(SECURITY_SOLUTION_OWNER);
    return { syncAlerts, extractObservables };
  }, []);

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

  const handleCreate = useCallback(
    async (data: YamlEditorFormValues, metadata: TemplateMetadata, isEnabled: boolean) => {
      const created = await mutateAsync({
        template: {
          name: metadata.name,
          description: metadata.description || undefined,
          tags: withInvestigationTag(metadata.tags),
          owner: SECURITY_SOLUTION_OWNER,
          definition: data.definition,
          isEnabled,
        },
      });
      await refreshTemplates();
      // Stay in the editor after the first save, now editing the template that was created, so a
      // second save makes a new version instead of a duplicate.
      navigate(getTemplatePath(created.templateId));
    },
    [mutateAsync, navigate, refreshTemplates]
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

  return (
    <div data-test-subj="investigationTemplateCreatePage">
      <TemplateFormLayout
        form={form}
        initialMetadata={INITIAL_METADATA}
        isSaving={isSaving}
        onCreate={handleCreate}
        storageKey={CREATE_DRAFT_KEY}
        initialValue={exampleTemplateDefinition}
        initialSettings={initialSettings}
        back={back}
      />
    </div>
  );
};
TemplateCreatePage.displayName = 'TemplateCreatePage';
