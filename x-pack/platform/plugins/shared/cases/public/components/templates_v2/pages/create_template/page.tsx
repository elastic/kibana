/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import type { FC } from 'react';
import { useForm } from 'react-hook-form';
import type { TemplateFormValues } from '../../components/template_form';
import { CreateTemplateForm } from '../../components/template_form';
import { exampleTemplateDefinition } from '../../field_types/constants';
import { GENERAL_CASES_OWNER } from '../../../../../common/constants';
import { TemplateFormLayout } from '../../components/template_form_layout';

import * as i18n from '../../translations';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CreateTemplatePageProps {}

export const CreateTemplatePage: FC<CreateTemplatePageProps> = () => {
  const form = useForm<TemplateFormValues>({
    defaultValues: {
      name: '',
      owner: GENERAL_CASES_OWNER,
      definition: exampleTemplateDefinition,
    },
  });

  // NOTE: reset the form to propagate initial value to the renderer.
  // For some reason it does not happen automatically.
  useEffect(() => {
    form.reset();
  }, [form]);

  return (
    <TemplateFormLayout
      form={form}
      title={i18n.ADD_TEMPLATE_TITLE}
      formContent={<CreateTemplateForm />}
    />
  );
};

CreateTemplatePage.displayName = 'CreateTemplatePage';

// eslint-disable-next-line import/no-default-export
export default CreateTemplatePage;
