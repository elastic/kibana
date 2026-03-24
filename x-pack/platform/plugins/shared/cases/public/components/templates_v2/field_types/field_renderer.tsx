/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import type { z } from '@kbn/zod/v4';
import React from 'react';
import { FormProvider, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { ParsedTemplateDefinitionSchema } from '../../../../common/types/domain/template/latest';
import { CASE_EXTENDED_FIELDS } from '../../../../common/constants';
import { controlRegistry } from './field_types_registry';
import { useYamlFormSync } from './hooks/use_yaml_form_sync';
import { getYamlDefaultAsString } from '../utils';

type ParsedTemplateDefinition = z.infer<typeof ParsedTemplateDefinitionSchema>;

export interface TemplateFieldRendererProps {
  parsedTemplate: ParsedTemplateDefinition;
  onFieldDefaultChange?: (fieldName: string, value: string, control: string) => void;
}

/**
 * WARN: this component uses shared-form renderer for Case form compatiblity.
 * Dont change this until we migrate everything to react hook form.
 */
export const TemplateFieldRenderer: FC<TemplateFieldRendererProps> = ({
  parsedTemplate,
  onFieldDefaultChange,
}) => {
  const templateKey = React.useMemo(
    () => parsedTemplate.fields.map((f) => `${f.name}:${f.type}`).join('|'),
    [parsedTemplate.fields]
  );

  const initialDefaultValues = React.useMemo(() => {
    const defaults: Record<string, Record<string, string>> = {
      [CASE_EXTENDED_FIELDS]: {},
    };
    for (const field of parsedTemplate.fields) {
      const yamlDefault = getYamlDefaultAsString(field.metadata?.default);
      const fieldKey = `${field.name}_as_${field.type}`;
      defaults[CASE_EXTENDED_FIELDS][fieldKey] = yamlDefault;
    }
    return defaults;
  }, [parsedTemplate.fields]);

  const { form } = useForm<{}>({
    defaultValue: initialDefaultValues,
    options: { stripEmptyFields: false },
  });

  useYamlFormSync(form, parsedTemplate.fields, onFieldDefaultChange);

  return (
    <FormProvider key={templateKey} form={form}>
      {parsedTemplate.fields.map((field) => {
        const Control = controlRegistry[field.control] as FC<Record<string, unknown>>;

        return <Control key={field.name} {...field} />;
      })}
    </FormProvider>
  );
};

TemplateFieldRenderer.displayName = 'TemplateFieldRenderer';
