/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { z } from '@kbn/zod/v4';
import { ZodError } from '@kbn/zod/v4';
import type { ValidationFunc } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { i18n } from '@kbn/i18n';
import { EuiText } from '@elastic/eui';
import type { FormConfig } from './form';
import { getWidgetComponent } from './widgets';
import { extractSchemaCore } from './schema_extract_core';
import { addMeta, getMeta } from './schema_connector_metadata';

const OPTIONAL_LABEL = i18n.translate('responseOps.formGenerator.fieldBuilder.optionalLabel', {
  defaultMessage: 'Optional',
});

export type FieldValidationFunc = (
  ...args: Parameters<ValidationFunc>
) => ReturnType<ValidationFunc<any>>;

export interface FieldDefinition {
  /* The dot-notated path to the field within the form data */
  path: string;
  /* Validation function for the field */
  validate: FieldValidationFunc;
  /* The Zod schema for the field */
  schema: z.ZodType;
  /* Global form configuration */
  formConfig: FormConfig;
  /* Options for fields like select dropdowns */
  options?: Record<string, unknown>;
  defaultValue?: unknown;
  isOptional?: boolean;
}

interface GetFieldFromSchemaProps {
  schema: z.ZodType;
  path: string;
  formConfig: FormConfig;
}
export const getFieldFromSchema = ({
  schema: outerSchema,
  path,
  formConfig,
}: GetFieldFromSchemaProps) => {
  // Some schemas are wrapped (e.g., with ZodOptional or ZodDefault), so we unwrap them to get the underlying schema. Because we might unwrap default values, we also extract the default value here.
  const { schema, defaultValue, isOptional } = extractSchemaCore(outerSchema);

  return {
    path,
    schema,
    formConfig,
    defaultValue,
    isOptional,
    validate: (...args: Parameters<ValidationFunc>): ReturnType<ValidationFunc> => {
      const [{ value, path: formPath }] = args;

      try {
        schema.parse(value);
        return undefined;
      } catch (error) {
        if (!(error instanceof ZodError)) {
          throw new Error(`Unexpected validation error: ${error}`);
        }

        const errors = error.issues.map((issue) => {
          return issue.message;
        });

        if (errors.length > 0) {
          // Join multiple Zod error messages into a single string
          // The ValidationFunc type requires message to be a string, not an array
          return { path: formPath, message: errors.join(', ') };
        }

        return undefined;
      }
    },
  };
};

export const getFieldsFromSchema = <T extends z.ZodRawShape>({
  schema,
  rootPath,
  formConfig,
}: {
  schema: z.ZodObject<T>;
  rootPath?: string;
  formConfig: FormConfig;
}) => {
  const fields: FieldDefinition[] = [];
  const isFormOrParentDisabled = formConfig.disabled || getMeta(schema).disabled;

  Object.keys(schema.shape).forEach((key) => {
    const fieldSchema = schema.shape[key] as z.ZodType;
    const fieldMeta = getMeta(fieldSchema);
    const path = rootPath ? `${rootPath}.${key}` : key;

    // If the form or parent schema is disabled, propagate that to the field schema
    if (isFormOrParentDisabled && fieldMeta.disabled !== false) {
      addMeta(fieldSchema, { disabled: true });
    }

    const field = getFieldFromSchema({
      schema: fieldSchema,
      path,
      formConfig,
    });

    fields.push(field);
  });

  return fields;
};

interface RenderFieldProps {
  field: FieldDefinition;
}
export const renderField = ({ field }: RenderFieldProps) => {
  const { schema, validate, path, formConfig, defaultValue, isOptional } = field;

  const WidgetComponent = getWidgetComponent(schema);

  // getWidgetComponent might update meta information, therefore we get the meta after calling it
  const { label, helpText, disabled, placeholder } = getMeta(schema);

  return (
    <React.Fragment key={path}>
      <WidgetComponent
        key={path}
        path={path}
        schema={schema}
        formConfig={formConfig}
        fieldConfig={{
          label,
          defaultValue,
          validations: [
            {
              validator: validate,
            },
          ],
        }}
        fieldProps={{
          helpText,
          fullWidth: true,
          labelAppend: isOptional ? (
            <EuiText size="xs" color="subdued">
              {OPTIONAL_LABEL}
            </EuiText>
          ) : null,
          euiFieldProps: {
            disabled: formConfig.disabled || disabled,
            placeholder,
            ['data-test-subj']: `generator-field-${path.replace(/\./g, '-')}`,
          },
        }}
      />
    </React.Fragment>
  );
};
