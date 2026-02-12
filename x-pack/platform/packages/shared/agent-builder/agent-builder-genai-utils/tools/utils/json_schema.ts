/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { JsonSchema7ObjectType, JsonSchema7Type } from 'zod-to-json-schema';

/**
 * Wraps a JSON schema in an object if not already an object'.
 * Used to make sure the schema will be compatible with structured output mode for LLMs
 */
export const wrapJsonSchema = ({
  schema,
  property = 'response',
  description = 'The response to provide',
}: {
  schema: JsonSchema7Type;
  property?: string;
  description?: string;
}): { wrapped: boolean; schema: JsonSchema7Type } => {
  if ('type' in schema && schema.type === 'object') {
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
    } as JsonSchema7ObjectType,
  };
};
