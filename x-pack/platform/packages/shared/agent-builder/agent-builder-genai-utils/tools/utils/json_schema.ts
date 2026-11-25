/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, inlineRootJsonSchemaRef, type ZodType } from '@kbn/zod/v4';
// eslint-disable-next-line @kbn/eslint/module_migration
import type { JSONSchema } from 'zod/v4/core/json-schema';

/** Converts a tool input Zod schema to JSON Schema for LLM providers (inlines root `.meta({ id })` `$ref`s). */
export const zodToolInputToJsonSchema = (schema: ZodType): JSONSchema => {
  const { $schema: _$schema, ...rest } = z.toJSONSchema(schema, {
    io: 'input',
    unrepresentable: 'any',
  }) as Record<string, unknown>;
  return inlineRootJsonSchemaRef(rest) as JSONSchema;
};

/**
 * Wraps a JSON schema in an object if not already an object'.
 * Used to make sure the schema will be compatible with structured output mode for LLMs
 */
export const wrapJsonSchema = ({
  schema,
  property = 'response',
  description = 'The response to provide',
}: {
  schema: JSONSchema;
  property?: string;
  description?: string;
}): { wrapped: boolean; schema: JSONSchema } => {
  if (schema.type === 'object') {
    return {
      wrapped: false,
      schema: { ...schema, description: schema.description ?? description },
    };
  }
  return {
    wrapped: true,
    schema: {
      type: 'object',
      description,
      properties: {
        [property]: schema,
      },
    },
  };
};
