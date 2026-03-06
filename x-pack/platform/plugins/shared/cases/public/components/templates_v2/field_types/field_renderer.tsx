/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import type { z } from '@kbn/zod';
import React from 'react';
import { FormProvider, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { ParsedTemplateDefinitionSchema } from '../../../../common/types/domain/template/latest';
import { controlRegistry } from './field_types_registry';

type ParsedTemplateDefinition = z.infer<typeof ParsedTemplateDefinitionSchema>;

export interface TemplateFieldRendererProps {
  parsedTemplate: ParsedTemplateDefinition;
  values?: Record<string, unknown>;
}

/**
 * WARN: this component uses shared-form renderer for Case form compatiblity.
 * Dont change this until we migrate everything to react hook form.
 */
export const TemplateFieldRenderer: FC<TemplateFieldRendererProps> = ({
  parsedTemplate,
  values = {},
}) => {
  // NOTE: we are using `@kbn/es-ui-shared-plugin` here for compatibility with the current cases code.
  const { form } = useForm<{}>({
    defaultValue: {},
    options: { stripEmptyFields: false },
  });

  return (
    <FormProvider form={form}>
      {parsedTemplate.fields.map((field) => {
        const Control = controlRegistry[field.control] as FC<Record<string, unknown>>;
        const controlProps = { ...field, value: values[field.name] };

        return <Control key={field.name} {...controlProps} />;
      })}
    </FormProvider>
  );
};

TemplateFieldRenderer.displayName = 'TemplateFieldRenderer';
