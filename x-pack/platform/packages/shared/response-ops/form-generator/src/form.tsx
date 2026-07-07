/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { z } from '@kbn/zod/v4';
import { getFieldsFromSchema, renderField } from './field_builder';
import { type MetaFunctions, type GetMetaFn, type SetMetaFn } from './meta_types';
import { getMeta as defaultGetMeta, setMeta as defaultSetMeta } from './schema_connector_metadata';

export interface FormConfig {
  disabled?: boolean;
  // Indicated wheter we are editing an existing record or creating a new one
  isEdit?: boolean;
}

export interface GenerateFormFieldsParams<TSchema extends z.ZodObject<z.ZodRawShape>> {
  schema: TSchema;
  formConfig?: FormConfig;
  /**
   * Optional meta functions to use for accessing schema metadata.
   * When provided, these functions will be used instead of the default ones.
   *
   * This is useful when your schema was created using a different Zod instance
   * than the form generator uses internally (e.g., due to webpack module duplication).
   * By passing the same getMeta/setMeta functions that were used when
   * creating the schema, you ensure metadata is correctly retrieved.
   *
   * @example
   * // Import from the same module that created the schema
   *
   * const zodSchema = fromConnectorSpecSchema(jsonSchema);
   * generateFormFields({
   *   schema: zodSchema,
   *   metaFunctions: { getMeta, setMeta },
   * });
   */
  metaFunctions?: Partial<MetaFunctions>;
}

/**
 * Resolved meta functions used internally.
 * Exported for use by field_builder and other internal modules.
 */
export interface ResolvedMetaFunctions {
  getMeta: GetMetaFn;
  setMeta: SetMetaFn;
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
 * @param params.metaFunctions - Optional meta functions for accessing schema metadata
 * @returns Array of React elements representing the form fields
 *
 */
export function generateFormFields<TSchema extends z.ZodObject<z.ZodRawShape>>({
  schema,
  formConfig = {},
  metaFunctions,
}: GenerateFormFieldsParams<TSchema>) {
  const resolvedMeta: ResolvedMetaFunctions = {
    getMeta: metaFunctions?.getMeta ?? defaultGetMeta,
    setMeta: metaFunctions?.setMeta ?? defaultSetMeta,
  };

  const fields = getFieldsFromSchema({ schema, formConfig, meta: resolvedMeta });
  const renderedFields = fields.map((field) => renderField({ field, meta: resolvedMeta }));

  return <>{renderedFields}</>;
}
