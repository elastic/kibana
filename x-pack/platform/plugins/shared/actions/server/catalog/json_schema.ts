/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { extractUiMeta, fromJSONSchema, type JsonSchema } from '@kbn/zod/v4/from_json_schema';

const IP_FORMATS: Record<string, () => z.ZodType> = {
  ipv4: () => z.ipv4(),
  ipv6: () => z.ipv6(),
};

const withMeta = (jsonSchema: JsonSchema, zodSchema: z.ZodType): z.ZodType => {
  const extracted = extractUiMeta(jsonSchema);
  const { xUi, ...flat } = extracted;
  const meta =
    xUi !== null && typeof xUi === 'object' && !Array.isArray(xUi)
      ? { ...flat, ...(xUi as Record<string, unknown>) }
      : flat;
  if (Object.keys(meta).length > 0) z.globalRegistry.add(zodSchema, meta);
  return zodSchema;
};

const enrichObject = (jsonSchema: JsonSchema, path: string): z.ZodType => {
  const required = new Set(jsonSchema.required ?? []);
  const shape: Record<string, z.ZodType> = {};
  for (const [key, property] of Object.entries(jsonSchema.properties ?? {})) {
    if (typeof property !== 'object' || property === null) {
      throw new Error(`Unsupported JSON Schema at ${path}.properties.${key}.`);
    }
    let field = declarativeJsonSchemaToZod(
      property as Record<string, unknown>,
      `${path}.properties.${key}`
    );
    if (!required.has(key)) field = field.optional();
    if (property.default !== undefined) field = field.default(property.default);
    shape[key] = withMeta(property, field);
  }
  const objectSchema =
    jsonSchema.additionalProperties === true ? z.looseObject(shape) : z.strictObject(shape);
  return withMeta(jsonSchema, objectSchema);
};

export const declarativeJsonSchemaToZod = (
  schema: Record<string, unknown>,
  path: string
): z.ZodType => {
  const jsonSchema = schema as JsonSchema;
  if (jsonSchema.type === 'object') return enrichObject(jsonSchema, path);
  if (jsonSchema.type === 'array' && jsonSchema.items && typeof jsonSchema.items === 'object') {
    return withMeta(
      jsonSchema,
      z.array(
        declarativeJsonSchemaToZod(jsonSchema.items as Record<string, unknown>, `${path}.items`)
      )
    );
  }
  const converted = fromJSONSchema(schema, { preserveMeta: true });
  if (!converted) throw new Error(`Unsupported JSON Schema at ${path}.`);
  const factory = typeof jsonSchema.format === 'string' ? IP_FORMATS[jsonSchema.format] : undefined;
  return factory ? withMeta(jsonSchema, factory()) : converted;
};
