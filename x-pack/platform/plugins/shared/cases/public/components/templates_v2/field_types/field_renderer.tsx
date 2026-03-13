/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import type { z } from '@kbn/zod/v4';
import React, { useMemo } from 'react';
import {
  FormProvider,
  useForm,
  useFormData,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { ParsedTemplateDefinitionSchema } from '../../../../common/types/domain/template/latest';
import { CASE_EXTENDED_FIELDS } from '../../../../common/constants';
import { controlRegistry } from './field_types_registry';
import { evaluateCondition } from './evaluate_conditions';

type ParsedTemplateDefinition = z.infer<typeof ParsedTemplateDefinitionSchema>;

export interface TemplateFieldRendererProps {
  parsedTemplate: ParsedTemplateDefinition;
  values?: Record<string, unknown>;
}

const FieldsRenderer: FC<{
  parsedTemplate: ParsedTemplateDefinition;
  values: Record<string, unknown>;
}> = ({ parsedTemplate, values }) => {
  const fieldTypeMap = useMemo(
    () => Object.fromEntries(parsedTemplate.fields.map((f) => [f.name, f.type])),
    [parsedTemplate.fields]
  );

  const allFieldPaths = useMemo(
    () => parsedTemplate.fields.map((f) => `${CASE_EXTENDED_FIELDS}.${f.name}_as_${f.type}`),
    [parsedTemplate.fields]
  );

  const [formData] = useFormData({ watch: allFieldPaths });

  const fieldValues = useMemo(() => {
    const extendedFields =
      (formData as Record<string, Record<string, unknown>>)?.[CASE_EXTENDED_FIELDS] ?? {};
    return Object.fromEntries(
      parsedTemplate.fields.map((f) => [f.name, extendedFields[`${f.name}_as_${f.type}`]])
    );
  }, [formData, parsedTemplate.fields]);

  return (
    <>
      {parsedTemplate.fields.map((field) => {
        // Evaluate display condition — skip rendering if false
        if (field.display?.show_when) {
          const shouldShow = evaluateCondition(field.display.show_when, fieldValues, fieldTypeMap);
          if (!shouldShow) return null;
        }

        // Compute isRequired from static flag or conditional
        const isRequired =
          field.validation?.required === true ||
          (field.validation?.required_when
            ? evaluateCondition(field.validation.required_when, fieldValues, fieldTypeMap)
            : false);

        const Control = controlRegistry[field.control] as FC<Record<string, unknown>>;
        const controlProps = {
          ...field,
          value: values[field.name],
          isRequired,
          patternValidation: field.validation?.pattern,
          min: field.validation?.min,
          max: field.validation?.max,
          minLength: field.validation?.min_length,
          maxLength: field.validation?.max_length,
        };

        return <Control key={field.name} {...controlProps} />;
      })}
    </>
  );
};

FieldsRenderer.displayName = 'FieldsRenderer';

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
      <FieldsRenderer parsedTemplate={parsedTemplate} values={values} />
    </FormProvider>
  );
};

TemplateFieldRenderer.displayName = 'TemplateFieldRenderer';
