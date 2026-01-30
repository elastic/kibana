/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import type { z } from '@kbn/zod/v4';
import { addMeta, getMeta } from '@kbn/connector-specs/src/connector_spec_ui';
import { type DiscriminatedUnionWidgetProps } from './discriminated_union_widget';
import { getFieldsFromSchema, renderField } from '../../../field_builder';

// This widget represents an object inside a discriminated union. For example, given an initial schema like:
// z.discriminatedUnion('type', [
//   z.object({ type: z.literal('none') }),
//   z.object({ type: z.literal('basic'), token: z.string() })
// ])
//
// in SingleOptionUnionWidget component,
//   the options prop will be either `z.object({ type: z.literal('none') })` or `z.object({ type: z.literal('basic'), token: z.string() })`

export const SingleOptionUnionWidget: React.FC<DiscriminatedUnionWidgetProps> = ({
  path: rootPath,
  options,
  discriminatorKey,
  schema,
  fieldConfig,
  fieldProps,
  formConfig,
}) => {
  const optionSchema = options[0];

  if (!optionSchema) {
    throw new Error(`SingleOptionUnionWidget requires an option in schema at path: ${rootPath}`);
  }

  // Hide the discriminator field since its value is implied by the selected option
  // E.g., if the option is { type: z.literal('basic'), token: z.string() }, then the 'type' field should be hidden
  addMeta(optionSchema.shape[discriminatorKey] as z.ZodType, {
    hidden: true,
    disabled: true,
  });

  // If the parent discriminated union is disabled, propagate that to the option schema
  const isParentDisabled = formConfig.disabled || getMeta(schema).disabled;
  if (isParentDisabled && getMeta(optionSchema).disabled !== false) {
    addMeta(optionSchema, { disabled: true });
  }

  const fields = getFieldsFromSchema({
    schema: optionSchema,
    rootPath,
    formConfig,
  });

  return fields.map((field) => renderField({ field }));
};
