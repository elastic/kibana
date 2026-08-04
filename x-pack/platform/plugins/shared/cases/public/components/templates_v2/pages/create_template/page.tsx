/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { FC } from 'react';
import { useForm } from 'react-hook-form';
import type { YamlEditorFormValues } from '../../components/template_form';
import { exampleTemplateDefinition } from '../../field_types/constants';
import { TemplateFormLayout } from '../../components/template_form_layout';
import { useCreateTemplate } from '../../hooks/use_create_template';
import { useCasesContext } from '../../../cases_context/use_cases_context';
import { useCasesFeatures } from '../../../../common/use_cases_features';
import { useAvailableCasesOwners } from '../../../app/use_available_owners';
import { getOwnerDefaultValue } from '../../../create/utils';
import {
  useCasesEditTemplateNavigation,
  useCasesTemplatesNavigation,
} from '../../../../common/navigation';
import { LOCAL_STORAGE_KEYS, SECURITY_SOLUTION_OWNER } from '../../../../../common/constants';
import { useCasesTemplatesBreadcrumbs } from '../../../use_breadcrumbs';
import { useCasesLocalStorage } from '../../../../common/use_cases_local_storage';
import { CreateTemplateModal } from '../../components/create_template_modal';
import type { TemplateMetadata } from '../../utils/template_metadata';
import type { TemplateSettings } from '../../../../../common/types/domain/template/v1';

import * as i18n from '../../translations';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CreateTemplatePageProps {}

const EMPTY_METADATA: TemplateMetadata = { name: '', description: '', tags: [] };

export const CreateTemplatePage: FC<CreateTemplatePageProps> = () => {
  useCasesTemplatesBreadcrumbs(i18n.ADD_TEMPLATE_TITLE);
  const { navigateToCasesTemplates } = useCasesTemplatesNavigation();

  // The layout reads its metadata draft from this key, so writing the modal's result here is what
  // hands the name over — one storage key stays the single source of truth for template identity,
  // rather than the modal and the Configuration tab each holding their own copy.
  const [metadataDraft, setMetadataDraft] = useCasesLocalStorage<TemplateMetadata>(
    `${LOCAL_STORAGE_KEYS.templatesYamlEditorCreateState}.metadata`,
    EMPTY_METADATA
  );

  // A returning user with a named draft has already answered this, so don't ask again.
  const [isNamed, setIsNamed] = useState(() => (metadataDraft?.name ?? '').trim().length > 0);

  const handleModalConfirm = useCallback(
    (metadata: TemplateMetadata) => {
      setMetadataDraft(metadata);
      setIsNamed(true);
    },
    [setMetadataDraft]
  );

  const initialMetadata = metadataDraft ?? EMPTY_METADATA;

  const form = useForm<YamlEditorFormValues>({
    defaultValues: {
      definition: exampleTemplateDefinition,
    },
  });
  const { mutateAsync, isLoading: isSaving } = useCreateTemplate();
  const { owner } = useCasesContext();
  const availableOwners = useAvailableCasesOwners();
  const defaultOwnerValue = owner[0] ?? getOwnerDefaultValue(availableOwners);
  const { navigateToCasesEditTemplate } = useCasesEditTemplateNavigation();
  const { isExtractObservablesEnabled } = useCasesFeatures();

  // Defaults for a new template mirror toggle visibility: extract observables on only where the
  // solution enables it, sync alerts on only for Security (the toggles are hidden otherwise).
  // Gated on the (synchronous) feature config rather than license, since the license loads async
  // and the panel seeds these defaults once at mount.
  const initialSettings = useMemo<TemplateSettings>(
    () => ({
      syncAlerts: defaultOwnerValue === SECURITY_SOLUTION_OWNER,
      extractObservables: isExtractObservablesEnabled,
    }),
    [defaultOwnerValue, isExtractObservablesEnabled]
  );

  const handleCreate = useCallback(
    async (data: YamlEditorFormValues, metadata: TemplateMetadata, isEnabled: boolean) => {
      const created = await mutateAsync({
        template: {
          name: metadata.name,
          description: metadata.description || undefined,
          tags: metadata.tags.length > 0 ? metadata.tags : undefined,
          owner: defaultOwnerValue,
          definition: data.definition,
          isEnabled,
        },
      });
      // Stay in the editor after the first save: switch to edit mode for the new template so a
      // subsequent Save updates it instead of creating a duplicate.
      navigateToCasesEditTemplate({ templateId: created.templateId });
    },
    [defaultOwnerValue, mutateAsync, navigateToCasesEditTemplate]
  );

  if (!isNamed) {
    return (
      <CreateTemplateModal
        initialMetadata={initialMetadata}
        onCancel={navigateToCasesTemplates}
        onConfirm={handleModalConfirm}
      />
    );
  }

  return (
    <TemplateFormLayout
      form={form}
      title={i18n.ADD_TEMPLATE_TITLE}
      initialMetadata={initialMetadata}
      isSaving={isSaving}
      onCreate={handleCreate}
      storageKey={LOCAL_STORAGE_KEYS.templatesYamlEditorCreateState}
      initialValue={exampleTemplateDefinition}
      initialSettings={initialSettings}
    />
  );
};

CreateTemplatePage.displayName = 'CreateTemplatePage';

// eslint-disable-next-line import/no-default-export
export default CreateTemplatePage;
