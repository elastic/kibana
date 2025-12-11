/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { WorkflowDetailDto } from '@kbn/workflows/types/v1';
import { normalizeInputsToJsonSchema } from '@kbn/workflows/spec/lib/input_conversion';
import type { JSONSchema7 } from 'json-schema';

// Simple JSON Schema to Zod converter for basic types
function convertJsonSchemaToZodSimple(schema: JSONSchema7): z.ZodTypeAny {
  switch (schema.type) {
    case 'string':
      return z.string();
    case 'number':
    case 'integer':
      return z.number();
    case 'boolean':
      return z.boolean();
    case 'array': {
      const items = schema.items as JSONSchema7 | undefined;
      if (items) {
        return z.array(convertJsonSchemaToZodSimple(items));
      }
      return z.array(z.any());
    }
    case 'object': {
      if (schema.properties) {
        const shape: Record<string, z.ZodTypeAny> = {};
        for (const [key, propSchema] of Object.entries(schema.properties)) {
          const prop = propSchema as JSONSchema7;
          const isRequired = schema.required?.includes(key) ?? false;
          let zodProp = convertJsonSchemaToZodSimple(prop);
          if (!isRequired) {
            zodProp = zodProp.optional();
          }
          shape[key] = zodProp;
        }
        return z.object(shape);
      }
      return z.record(z.any());
    }
    default:
      return z.any();
  }
}

export const generateSchema = ({ workflow }: { workflow: WorkflowDetailDto }): z.ZodObject<any> => {
  if (!workflow.definition || !workflow.definition.inputs) {
    return z.object({});
  }

  // Normalize inputs to the new JSON Schema format (handles backward compatibility)
  const normalizedInputs = normalizeInputsToJsonSchema(workflow.definition.inputs);

  if (!normalizedInputs?.properties) {
    return z.object({});
  }

  const schemaFields: Record<string, z.ZodTypeAny> = {};

  for (const [propertyName, propertySchema] of Object.entries(normalizedInputs.properties)) {
    const jsonSchema = propertySchema as JSONSchema7;

    // Convert JSON Schema to Zod schema
    let field: z.ZodTypeAny = convertJsonSchemaToZodSimple(jsonSchema);

    // Apply description
    if (jsonSchema.description) {
      field = field.describe(jsonSchema.description);
    }

    // Check if this property is required
    const isRequired = normalizedInputs.required?.includes(propertyName) ?? false;
    if (!isRequired) {
      field = field.optional();
    }

    // Apply default value if present
    if (jsonSchema.default !== undefined) {
      field = field.default(jsonSchema.default);
    }

    schemaFields[propertyName] = field;
  }

  return z.object(schemaFields).describe('Parameters needed to execute the workflow');
};
