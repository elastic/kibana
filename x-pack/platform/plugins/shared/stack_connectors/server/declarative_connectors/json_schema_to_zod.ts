/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { DeclarativeJsonSchema } from './types';

const withCommonOptions = (zodSchema: z.ZodType, definition: DeclarativeJsonSchema): z.ZodType => {
  let result = zodSchema;
  if (definition.enum) {
    result = result.refine(
      (value) => definition.enum?.some((candidate) => Object.is(candidate, value)) ?? false,
      `Value must be one of: ${definition.enum.map(String).join(', ')}`
    );
  }
  if (definition.description) {
    result = result.describe(definition.description);
  }
  if (definition.xUi) {
    result = result.meta(definition.xUi);
  }
  if (definition.default !== undefined) {
    result = z.preprocess((value) => (value === undefined ? definition.default : value), result);
  }
  return result;
};

export const declarativeJsonSchemaToZod = (definition: DeclarativeJsonSchema): z.ZodType => {
  switch (definition.type) {
    case 'object': {
      const required = new Set(definition.required ?? []);
      const shape = Object.fromEntries(
        Object.entries(definition.properties ?? {}).map(([key, property]) => {
          const propertySchema = declarativeJsonSchemaToZod(property);
          return [
            key,
            required.has(key) || property.default !== undefined
              ? propertySchema
              : propertySchema.optional(),
          ];
        })
      );
      const objectSchema =
        definition.additionalProperties === true
          ? z.object(shape).passthrough()
          : z.object(shape).strict();
      return withCommonOptions(objectSchema, definition);
    }
    case 'string': {
      let baseStringSchema = z.string();
      if (definition.minLength !== undefined) {
        baseStringSchema = baseStringSchema.min(definition.minLength);
      }
      if (definition.maxLength !== undefined) {
        baseStringSchema = baseStringSchema.max(definition.maxLength);
      }
      let formattedStringSchema: z.ZodType = baseStringSchema;
      if (definition.format === 'uri') formattedStringSchema = baseStringSchema.pipe(z.url());
      if (definition.format === 'ipv4') formattedStringSchema = baseStringSchema.pipe(z.ipv4());
      if (definition.format === 'date-time') {
        formattedStringSchema = baseStringSchema.pipe(z.iso.datetime());
      }
      return withCommonOptions(formattedStringSchema, definition);
    }
    case 'number': {
      let numberSchema = z.number();
      if (definition.minimum !== undefined) numberSchema = numberSchema.min(definition.minimum);
      if (definition.maximum !== undefined) numberSchema = numberSchema.max(definition.maximum);
      return withCommonOptions(numberSchema, definition);
    }
    case 'integer': {
      let integerSchema = z.number().int();
      if (definition.minimum !== undefined) integerSchema = integerSchema.min(definition.minimum);
      if (definition.maximum !== undefined) integerSchema = integerSchema.max(definition.maximum);
      return withCommonOptions(integerSchema, definition);
    }
    case 'boolean':
      return withCommonOptions(z.boolean(), definition);
    case 'array': {
      if (!definition.items) {
        throw new Error('Declarative array schemas require an items definition.');
      }
      return withCommonOptions(z.array(declarativeJsonSchemaToZod(definition.items)), definition);
    }
    default: {
      const exhaustiveCheck: never = definition.type;
      throw new Error(`Unsupported declarative schema type: ${exhaustiveCheck}`);
    }
  }
};
