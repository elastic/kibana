/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import { getFieldsFromSchema, renderField } from './field_builder';

export interface FormConfig {
  disabled?: boolean;
  // Indicated wheter we are editing an existing record or creating a new one
  isEdit?: boolean;
}

export interface GenerateFormFieldsParams<TSchema extends z.ZodObject<z.ZodRawShape>> {
  schema: TSchema;
  formConfig?: FormConfig;
}

/*
 * Generates form fields from a Zod schema for use within a Kibana Form component.
 * This function maps Zod schema definitions to appropriate form field widgets.
 *
 * @param params - Configuration for field generation
 * @param params.schema - Zod object schema defining the form structure
 * @param params.formConfig - Optional form configuration
 * @param params.formConfig.disabled - Whether the form fields are disabled
 * @param params.formConfig.isEdit - Whether we are editing an existing record or creating a new one
 * @returns Array of React elements representing the form fields
 *
 */
export function generateFormFields<TSchema extends z.ZodObject<z.ZodRawShape>>({
  schema,
  formConfig = {},
}: GenerateFormFieldsParams<TSchema>) {
  const fields = getFieldsFromSchema({ schema, formConfig });
  return fields.map((field) => renderField({ field }));
}
