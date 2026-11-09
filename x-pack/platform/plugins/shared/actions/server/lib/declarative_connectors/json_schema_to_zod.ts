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

const IPV4_PATTERN =
  /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

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

const applyFieldMeta = (schema: z.ZodType, ui: DeclarativeFieldMeta | undefined): z.ZodType => {
  if (!ui) {
    return schema;
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
  return setMeta(schema, meta);
};

const applyIpv4Format = (schema: z.ZodString): z.ZodType =>
  schema.refine((value) => IPV4_PATTERN.test(value), 'Invalid IPv4 address');

const convertLeaf = (definition: DeclarativeJsonSchema): z.ZodType => {
  const converted = fromJSONSchema(stripFieldMeta(definition));
  if (converted === undefined) {
    throw new DeclarativeConnectorSpecError(
      `Could not convert declarative JSON Schema of type "${definition.type}" to Zod.`
    );
  }
  if (definition.type === 'string' && definition.format === 'ipv4') {
    return applyIpv4Format(converted as z.ZodString);
  }
  return converted;
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
      shape[key] = applyFieldMeta(field, property.meta);
    }
    const objectSchema =
      definition.additionalProperties === false
        ? z.strictObject(shape)
        : definition.additionalProperties === true
        ? z.looseObject(shape)
        : z.object(shape);
    return applyFieldMeta(objectSchema, definition.meta);
  }

  if (definition.type === 'array') {
    if (!definition.items) {
      throw new DeclarativeConnectorSpecError(
        'Declarative array schemas require an items definition.'
      );
    }
    return applyFieldMeta(z.array(declarativeJsonSchemaToZod(definition.items)), definition.meta);
  }

  return applyFieldMeta(convertLeaf(definition), definition.meta);
};
