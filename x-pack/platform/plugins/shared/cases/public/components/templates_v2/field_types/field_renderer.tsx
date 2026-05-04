/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import type { z } from '@kbn/zod/v4';
import React, { useMemo } from 'react';
import type { FormHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import {
  FormProvider,
  useForm,
  useFormData,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { ParsedTemplateDefinitionSchema } from '../../../../common/types/domain/template/latest';
import { CASE_EXTENDED_FIELDS } from '../../../../common/constants';
import { controlRegistry } from './field_types_registry';
import { evaluateCondition } from '../../../../common/types/domain/template/evaluate_conditions';
import { useYamlFormSync } from './hooks/use_yaml_form_sync';
import { getFieldSnakeKey } from '../../../../common/utils';
import { getYamlDefaultAsString } from '../utils';

type ParsedTemplateDefinition = z.infer<typeof ParsedTemplateDefinitionSchema>;

export interface TemplateFieldRendererProps {
  parsedTemplate: ParsedTemplateDefinition;
  onFieldDefaultChange?: (fieldName: string, value: string, control: string) => void;
}

export const FieldsRenderer: FC<{
  parsedTemplate: ParsedTemplateDefinition;
  form: FormHook<{}>;
}> = ({ parsedTemplate, form }) => {
  const fieldTypeMap = useMemo(
    () => Object.fromEntries(parsedTemplate.fields.map((f) => [f.name, f.type])),
    [parsedTemplate.fields]
  );

  const fieldControlMap = useMemo(
    () => Object.fromEntries(parsedTemplate.fields.map((f) => [f.name, f.control])),
    [parsedTemplate.fields]
  );

  const allFieldPaths = useMemo(
    () =>
      parsedTemplate.fields.map(
        (f) => `${CASE_EXTENDED_FIELDS}.${getFieldSnakeKey(f.name, f.type)}`
      ),
    [parsedTemplate.fields]
  );

  const [formData] = useFormData({ form, watch: allFieldPaths });

  const fieldValues = useMemo(() => {
    const extendedFields =
      (formData as Record<string, Record<string, unknown>>)?.[CASE_EXTENDED_FIELDS] ?? {};
    return Object.fromEntries(
      parsedTemplate.fields.map((f) => [f.name, extendedFields[getFieldSnakeKey(f.name, f.type)]])
    );
  }, [formData, parsedTemplate.fields]);

  return (
    <>
      {parsedTemplate.fields.map((field) => {
        // Evaluate display condition — skip rendering if false
        if (field.display?.show_when) {
          const shouldShow = evaluateCondition(
            field.display.show_when,
            fieldValues,
            fieldTypeMap,
            fieldControlMap
          );
          if (!shouldShow) return null;
        }

        // Compute isRequired from static flag or conditional
        const isRequired =
          field.validation?.required === true ||
          (field.validation?.required_when
            ? evaluateCondition(
                field.validation.required_when,
                fieldValues,
                fieldTypeMap,
                fieldControlMap
              )
            : false);

        const Control = controlRegistry[field.control] as unknown as FC<Record<string, unknown>>;
        if (!Control) return null;

        const controlProps = {
          ...field,
          label: field.label ?? field.name,
          value: fieldValues[field.name],
          isRequired,
          patternValidation: field.validation?.pattern,
          min: field.validation?.min,
          max: field.validation?.max,
          minLength: field.validation?.min_length,
          maxLength: field.validation?.max_length,
        };

        return (
          <div key={field.name} data-test-subj={`template-field-${field.name}`}>
            <Control {...controlProps} />
          </div>
        );
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
  onFieldDefaultChange,
}) => {
  // Derive a stable content key from field definitions. JSON.stringify covers all
  // field properties (default, display, validation, etc.), so this string only changes
  // when YAML content actually changes — not on every re-parse that produces a new
  // array object with identical values.
  const fieldsKey = parsedTemplate.fields.map((f) => JSON.stringify(f)).join('|');

  // Stabilize the fields reference so useYamlFormSync's effect only fires when
  // field definitions actually change (content-based equality), not on every
  // re-parse of the same YAML which produces a new array object each time.
  const stableFieldsRef = React.useRef(parsedTemplate.fields);
  const prevKeyRef = React.useRef(fieldsKey);
  if (prevKeyRef.current !== fieldsKey) {
    prevKeyRef.current = fieldsKey;
    stableFieldsRef.current = parsedTemplate.fields;
  }
  const stableFields = stableFieldsRef.current;

  const initialDefaultValues = React.useMemo(() => {
    const defaults: Record<string, Record<string, string>> = {
      [CASE_EXTENDED_FIELDS]: {},
    };
    for (const field of stableFields) {
      const yamlDefault = getYamlDefaultAsString(field.metadata?.default);
      const fieldKey = getFieldSnakeKey(field.name, field.type);
      defaults[CASE_EXTENDED_FIELDS][fieldKey] = yamlDefault;
    }
    return defaults;
  }, [stableFields]);

  const { form } = useForm<{}>({
    defaultValue: initialDefaultValues,
    options: { stripEmptyFields: false },
  });

  useYamlFormSync(form, stableFields, onFieldDefaultChange);

  return (
    <FormProvider key={parsedTemplate.name} form={form}>
      <FieldsRenderer parsedTemplate={parsedTemplate} form={form} />
    </FormProvider>
  );
};

TemplateFieldRenderer.displayName = 'TemplateFieldRenderer';
