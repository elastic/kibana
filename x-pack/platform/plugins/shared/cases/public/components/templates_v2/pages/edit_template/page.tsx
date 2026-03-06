/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import type { FC } from 'react';
import { useForm } from 'react-hook-form';
import { dump as yamlDump } from 'js-yaml';
import { useTemplateViewParams, useCasesTemplatesNavigation } from '../../../../common/navigation';
import type { YamlEditorFormValues } from '../../components/template_form';
import { useGetTemplate } from '../../hooks/use_get_template';
import { useUpdateTemplate } from '../../hooks/use_update_template';
import { TemplateFormLayout } from '../../components/template_form_layout';
import { LOCAL_STORAGE_KEYS } from '../../../../../common/constants';
import { useCasesTemplatesBreadcrumbs } from '../../../use_breadcrumbs';
import * as i18n from '../../translations';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface EditTemplatePageProps {}

export const EditTemplatePage: FC<EditTemplatePageProps> = () => {
  const { templateId } = useTemplateViewParams();
  const { data: template, isLoading } = useGetTemplate(templateId);
  const { mutateAsync, isLoading: isSaving } = useUpdateTemplate();
  const { navigateToCasesTemplates } = useCasesTemplatesNavigation();

  useCasesTemplatesBreadcrumbs(template?.name ?? i18n.EDIT_TEMPLATE_TITLE);

  // Server version as initial value - useDebouncedYamlEdit will use WIP from storage if exists
  const serverDefinition = useMemo(() => {
    if (template) {
      return yamlDump(template.definition, { lineWidth: -1 }).trimEnd();
    }
    return '';
  }, [template]);

  const form = useForm<YamlEditorFormValues>({
    defaultValues: {
      definition: serverDefinition,
    },
  });

  useEffect(() => {
    if (!template) {
      return;
    }

    const definition = yamlDump(template.definition, { lineWidth: -1 }).trimEnd();
    form.reset({
      definition,
    });
  }, [form, template]);

  const handleSave = useCallback(
    async (data: YamlEditorFormValues) => {
      if (!templateId) {
        return;
      }
      await mutateAsync({
        templateId,
        template: {
          definition: data.definition,
        },
      });
      navigateToCasesTemplates();
    },
    [mutateAsync, navigateToCasesTemplates, templateId]
  );

  return (
    <TemplateFormLayout
      form={form}
      title={i18n.EDIT_TEMPLATE_TITLE}
      isLoading={isLoading && !template}
      isSaving={isSaving}
      onCreate={handleSave}
      isEdit
      storageKey={LOCAL_STORAGE_KEYS.templatesYamlEditorEditState}
      initialValue={serverDefinition}
      templateId={templateId}
    />
  );
};

EditTemplatePage.displayName = 'EditTemplatePage';

// eslint-disable-next-line import/no-default-export
export default EditTemplatePage;
