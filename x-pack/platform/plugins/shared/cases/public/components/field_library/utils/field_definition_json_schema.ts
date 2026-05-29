/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  InputTextFieldSchema,
  InputNumberFieldSchema,
  SelectBasicFieldSchema,
  TextareaFieldSchema,
  DatePickerFieldSchema,
  CheckboxGroupFieldSchema,
  RadioGroupFieldSchema,
} from '../../../../common/types/domain/template/fields';

export const FIELD_DEFINITION_SCHEMA_URI = 'file:///cases-field-definition-schema.json';

/**
 * Schema for a single inline field definition entry (ref fields excluded —
 * the library stores concrete field definitions, not references to other fields).
 */
const InlineFieldSchema = z.union([
  InputTextFieldSchema,
  InputNumberFieldSchema,
  SelectBasicFieldSchema,
  TextareaFieldSchema,
  DatePickerFieldSchema,
  CheckboxGroupFieldSchema,
  RadioGroupFieldSchema,
]);

export const getFieldDefinitionJsonSchema = (): z.core.JSONSchema.JSONSchema | null => {
  try {
    return z.toJSONSchema(InlineFieldSchema, {
      target: 'draft-7',
      unrepresentable: 'any',
      reused: 'inline',
      override: ({ jsonSchema, path }) => {
        // Remove additionalProperties from allOf items — same fix as the template schema
        const last = path[path.length - 1];
        const secondLast = path[path.length - 2];
        if (typeof last === 'number' && secondLast === 'allOf') {
          jsonSchema.additionalProperties = undefined;
        }
        // Add enum hints on discriminator property for Monaco autocomplete
        const { oneOf } = jsonSchema;
        if (oneOf && Array.isArray(oneOf) && oneOf.length > 0) {
          const branches = oneOf as Array<Record<string, unknown>>;
          const discriminatorValues: Record<string, string[]> = {};
          for (const branch of branches) {
            const props = (branch.properties ?? {}) as Record<string, { const?: string }>;
            for (const [k, v] of Object.entries(props)) {
              if (v?.const !== undefined) {
                discriminatorValues[k] = [...(discriminatorValues[k] ?? []), v.const];
              }
            }
          }
          for (const [k, vals] of Object.entries(discriminatorValues)) {
            if (vals.length === branches.length) {
              jsonSchema.properties = {
                ...(jsonSchema.properties as object),
                [k]: { type: 'string', enum: vals },
              };
            }
          }
        }
      },
    });
  } catch {
    return null;
  }
};
