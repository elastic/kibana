/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import type { FC } from 'react';
import { useForm } from 'react-hook-form';
import { dump as yamlDump } from 'js-yaml';
import { useTemplateViewParams } from '../../../../common/navigation';
import type { TemplateFormValues } from '../../components/template_form';
import { UpdateTemplateForm } from '../../components/template_form';
import { GENERAL_CASES_OWNER } from '../../../../../common/constants';
import { useGetTemplate } from '../../hooks/use_get_template';
import { TemplateFormLayout } from '../../components/template_form_layout';
import * as i18n from '../../translations';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface EditTemplatePageProps {}

export const EditTemplatePage: FC<EditTemplatePageProps> = () => {
  const { templateId } = useTemplateViewParams();
  const { data: template, isLoading } = useGetTemplate(templateId);

  const form = useForm<TemplateFormValues>({
    defaultValues: {
      name: '',
      owner: GENERAL_CASES_OWNER,
      definition: '',
    },
  });

  useEffect(() => {
    if (!template) {
      return;
    }

    const definition = yamlDump(template.definition, { lineWidth: -1 }).trimEnd();
    form.reset({
      name: template.name,
      owner: template.owner,
      definition,
    });
  }, [form, template]);

  return (
    <TemplateFormLayout
      form={form}
      title={i18n.EDIT_TEMPLATE_TITLE}
      isLoading={isLoading && !template}
      formContent={templateId ? <UpdateTemplateForm templateId={templateId} /> : null}
    />
  );
};

EditTemplatePage.displayName = 'EditTemplatePage';

// eslint-disable-next-line import/no-default-export
export default EditTemplatePage;
