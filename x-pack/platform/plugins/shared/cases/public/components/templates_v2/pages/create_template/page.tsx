/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect } from 'react';
import type { FC } from 'react';
import { useForm } from 'react-hook-form';
import type { YamlEditorFormValues } from '../../components/template_form';
import { exampleTemplateDefinition } from '../../field_types/constants';
import { TemplateFormLayout } from '../../components/template_form_layout';
import { useCreateTemplate } from '../../hooks/use_create_template';
import { useCasesContext } from '../../../cases_context/use_cases_context';
import { useAvailableCasesOwners } from '../../../app/use_available_owners';
import { getOwnerDefaultValue } from '../../../create/utils';
import { useCasesTemplatesNavigation } from '../../../../common/navigation';
import { LOCAL_STORAGE_KEYS } from '../../../../../common/constants';

import * as i18n from '../../translations';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CreateTemplatePageProps {}

export const CreateTemplatePage: FC<CreateTemplatePageProps> = () => {
  const form = useForm<YamlEditorFormValues>({
    defaultValues: {
      definition: exampleTemplateDefinition,
    },
  });
  const { mutateAsync, isLoading: isSaving } = useCreateTemplate();
  const { owner } = useCasesContext();
  const availableOwners = useAvailableCasesOwners();
  const defaultOwnerValue = owner[0] ?? getOwnerDefaultValue(availableOwners);
  const { navigateToCasesTemplates } = useCasesTemplatesNavigation();

  useEffect(() => {
    form.reset();
  }, [form]);

  const handleCreate = useCallback(
    async (data: YamlEditorFormValues) => {
      await mutateAsync({
        template: {
          owner: defaultOwnerValue,
          definition: data.definition,
        },
      });
      navigateToCasesTemplates();
    },
    [defaultOwnerValue, mutateAsync, navigateToCasesTemplates]
  );

  return (
    <TemplateFormLayout
      form={form}
      title={i18n.ADD_TEMPLATE_TITLE}
      isSaving={isSaving}
      onCreate={handleCreate}
      storageKey={LOCAL_STORAGE_KEYS.templatesYamlEditorCreateState}
      initialValue={exampleTemplateDefinition}
    />
  );
};

CreateTemplatePage.displayName = 'CreateTemplatePage';

// eslint-disable-next-line import/no-default-export
export default CreateTemplatePage;
