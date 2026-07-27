/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { FC } from 'react';
import { useForm } from 'react-hook-form';
import { useTemplateViewParams } from '../../../../common/navigation';
import type { YamlEditorFormValues } from '../../components/template_form';
import { useGetTemplate } from '../../hooks/use_get_template';
import { useUpdateTemplate } from '../../hooks/use_update_template';
import { TemplateFormLayout } from '../../components/template_form_layout';
import { LOCAL_STORAGE_KEYS } from '../../../../../common/constants';
import { useCasesTemplatesBreadcrumbs } from '../../../use_breadcrumbs';
import type { TemplateMetadata } from '../../utils/template_metadata';
import * as i18n from '../../translations';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface EditTemplatePageProps {}

export const EditTemplatePage: FC<EditTemplatePageProps> = () => {
  const { templateId } = useTemplateViewParams();
  const { data: template } = useGetTemplate(templateId);
  const { mutateAsync, isLoading: isSaving } = useUpdateTemplate();

  useCasesTemplatesBreadcrumbs(template?.name ?? i18n.EDIT_TEMPLATE_TITLE);

  const serverDefinition = useMemo(() => {
    if (template) {
      return template.definitionString.trimEnd();
    }
    return '';
  }, [template]);

  const form = useForm<YamlEditorFormValues>({
    defaultValues: {
      definition: serverDefinition,
    },
  });
  const initialMetadata = useMemo<TemplateMetadata>(
    () => ({
      name: template?.name ?? '',
      description: template?.description ?? '',
      tags: template?.tags ?? [],
    }),
    [template?.name, template?.description, template?.tags]
  );

  const handleSave = useCallback(
    async (data: YamlEditorFormValues, metadata: TemplateMetadata, isEnabled: boolean) => {
      if (!templateId) {
        return;
      }
      await mutateAsync({
        templateId,
        template: {
          name: metadata.name,
          // Send `undefined` (not '' / []) ONLY when the field is empty AND was empty on the stored
          // template — so a no-op Save on a template with no description/tags doesn't coerce them
          // into a persisted '' / [] via the PATCH `?? existing` fallback. When the user clears a
          // value that DID exist, send '' / [] so the clear is actually persisted.
          description:
            metadata.description === '' && !template?.description
              ? undefined
              : metadata.description,
          tags:
            metadata.tags.length === 0 && !(template?.tags && template.tags.length > 0)
              ? undefined
              : metadata.tags,
          definition: data.definition,
          isEnabled,
        },
      });
      // Stay in the editor after saving (no redirect to the list) so authoring can continue.
    },
    [mutateAsync, templateId, template?.description, template?.tags]
  );

  if (!template) {
    return null;
  }

  return (
    <TemplateFormLayout
      form={form}
      title={i18n.EDIT_TEMPLATE_TITLE}
      initialMetadata={initialMetadata}
      isSaving={isSaving}
      onCreate={handleSave}
      isEdit
      storageKey={LOCAL_STORAGE_KEYS.templatesYamlEditorEditState}
      initialValue={serverDefinition}
      templateId={templateId}
      initialIsEnabled={template?.isEnabled}
    />
  );
};

EditTemplatePage.displayName = 'EditTemplatePage';

// eslint-disable-next-line import/no-default-export
export default EditTemplatePage;
