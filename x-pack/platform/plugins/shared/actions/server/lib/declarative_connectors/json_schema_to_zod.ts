/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseMetadata } from '@kbn/connector-specs';
import { setMeta } from '@kbn/connector-specs';
import { z } from '@kbn/zod/v4';
import { fromJSONSchema } from '@kbn/zod/v4/from_json_schema';
import type { DeclarativeFieldMeta, DeclarativeJsonSchema } from './types';
import { DeclarativeConnectorSpecError } from './types';

const stripFieldMeta = (definition: DeclarativeJsonSchema): Record<string, unknown> => {
  const { meta: _meta, properties, items, ...rest } = definition;
  return {
    ...rest,
    ...(properties
      ? {
          properties: Object.fromEntries(
            Object.entries(properties).map(([key, property]) => [key, stripFieldMeta(property)])
          ),
        }
      : {}),
    ...(items ? { items: stripFieldMeta(items) } : {}),
  };
};

const applyFieldMeta = (
  schema: z.ZodType,
  ui: DeclarativeFieldMeta | undefined,
  description?: string
): z.ZodType => {
  let result = description === undefined ? schema : schema.describe(description);
  if (!ui) {
    return result;
  }
  const meta: BaseMetadata = {};
  if (ui.label !== undefined) {
    meta.label = ui.label;
  }
  if (ui.placeholder !== undefined) {
    meta.placeholder = ui.placeholder;
  }
  if (ui.helpText !== undefined) {
    meta.helpText = ui.helpText;
  }
  if (ui.hidden !== undefined) {
    meta.hidden = ui.hidden;
  }
  if (ui.validate?.allowedHosts !== undefined) {
    meta.validate = { allowedHosts: ui.validate.allowedHosts };
  }
  if (description !== undefined) {
    meta.description = description;
  }
  result = setMeta(result, meta);
  return result;
};

const convertLeaf = (definition: DeclarativeJsonSchema): z.ZodType => {
  // fromJSONSchema handles enum before type-specific constraints, and its URI
  // parser returns early before applying string length constraints. Convert
  // the base type first, then add these constraints in this adapter.
  const schemaDefinition = stripFieldMeta(definition);
  const enumValues = definition.enum;
  delete schemaDefinition.enum;
  if (
    definition.type === 'string' &&
    (definition.format === 'uri' || definition.format === 'ipv4')
  ) {
    delete schemaDefinition.format;
  }

  const converted = fromJSONSchema(schemaDefinition);
  if (converted === undefined) {
    throw new DeclarativeConnectorSpecError(
      `Could not convert declarative JSON Schema of type "${definition.type}" to Zod.`
    );
  }
  let result = converted;
  if (definition.type === 'string' && definition.format === 'uri') {
    result = (result as z.ZodString).url();
  }
  if (definition.type === 'string' && definition.format === 'ipv4') {
    let ipv4Schema = z.ipv4();
    if (definition.minLength !== undefined) {
      ipv4Schema = ipv4Schema.min(definition.minLength);
    }
    if (definition.maxLength !== undefined) {
      ipv4Schema = ipv4Schema.max(definition.maxLength);
    }
    result = ipv4Schema;
  }
  if (enumValues !== undefined) {
    // Keep only enum values accepted by the converted type schema. The enum
    // then represents the intersection without emitting an unsupported allOf.
    const allowedEnumValues = enumValues.filter((value) => result.safeParse(value).success);
    const enumSchema = fromJSONSchema({ type: definition.type, enum: allowedEnumValues });
    if (enumSchema === undefined) {
      throw new DeclarativeConnectorSpecError(
        `Could not convert declarative JSON Schema enum of type "${definition.type}" to Zod.`
      );
    }
    result = enumSchema;
  }
  return result;
};

/** Converts a declarative JSON Schema object into a Zod schema. */
export const declarativeJsonSchemaToZod = (definition: DeclarativeJsonSchema): z.ZodType => {
  if (definition.type === 'object') {
    const required = new Set(definition.required ?? []);
    const shape: Record<string, z.ZodType> = {};
    for (const [key, property] of Object.entries(definition.properties ?? {})) {
      let field = declarativeJsonSchemaToZod(property);
      if (!required.has(key)) {
        field = field.optional();
      }
      if (property.default !== undefined) {
        field = field.default(property.default);
      }
      shape[key] = applyFieldMeta(field, property.meta, property.description);
    }
    const objectSchema =
      definition.additionalProperties === false ? z.strictObject(shape) : z.looseObject(shape);
    return applyFieldMeta(objectSchema, definition.meta, definition.description);
  }

  if (definition.type === 'array') {
    if (!definition.items) {
      throw new DeclarativeConnectorSpecError(
        'Declarative array schemas require an items definition.'
      );
    }
    return applyFieldMeta(
      z.array(declarativeJsonSchemaToZod(definition.items)),
      definition.meta,
      definition.description
    );
  }

  return applyFieldMeta(convertLeaf(definition), definition.meta, definition.description);
};
