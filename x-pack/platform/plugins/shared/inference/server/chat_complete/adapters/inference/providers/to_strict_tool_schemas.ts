/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapValues } from 'lodash';
import type { ToolOptions, ToolSchema } from '@kbn/inference-common';
import { inlineRootJsonSchemaRef } from '@kbn/zod/v4';

/**
 * Keywords OpenAI structured outputs accept in strict mode.
 * https://developers.openai.com/api/docs/guides/structured-outputs#supported-schemas
 */
const STRICT_SCHEMA_FIELDS = new Set([
  'type',
  'description',
  'title',
  'enum',
  'const',
  'anyOf',
  'properties',
  'required',
  'additionalProperties',
  'items',
  'pattern',
  'format',
  'minimum',
  'maximum',
  'exclusiveMinimum',
  'exclusiveMaximum',
  'multipleOf',
  'minItems',
  'maxItems',
  '$ref',
  '$defs',
]);

const STRICT_STRING_FORMATS = new Set([
  'date-time',
  'time',
  'date',
  'duration',
  'email',
  'hostname',
  'ipv4',
  'ipv6',
  'uuid',
]);

/** Keywords strict mode rejects and that cannot be dropped without changing what the schema accepts. */
const STRICT_INCOMPATIBLE_FIELDS = [
  'allOf',
  'not',
  'if',
  'then',
  'else',
  'patternProperties',
  'dependentRequired',
  'dependentSchemas',
  'prefixItems',
];

/** `ToolSchemaType` does not model everything zod v4 emits, so the conversion operates on this loose representation. */
interface SchemaPart {
  [key: string]: unknown;
  type?: string | string[];
  format?: string;
  properties?: Record<string, SchemaPart>;
  required?: string[];
  additionalProperties?: SchemaPart | boolean;
  items?: SchemaPart | SchemaPart[];
  anyOf?: SchemaPart[];
  oneOf?: SchemaPart[];
  $defs?: Record<string, SchemaPart>;
}

class StrictIncompatibleSchemaError extends Error {}

export interface StrictToolSchemas {
  tools: ToolOptions['tools'];
  /** Names of the tools whose schema was rewritten to the strict shape, and can be sent with `strict: true`. */
  strictToolNames: string[];
}

/**
 * Rewrites tool schemas into the shape OpenAI strict function calling requires: every object
 * has `additionalProperties: false` and lists all of its properties in `required`, and each
 * originally optional property also accepts `null`.
 *
 * Without strict mode, GPT models fill optional parameters they do not need with zero values
 * (`false`, `""`, `[]`), which tools then apply as real filters. In strict mode they send
 * `null` for such parameters instead; `validateToolCalls` drops those nulls again, so tools
 * keep validating against their original schema.
 *
 * A tool whose schema strict mode cannot represent (free-form objects, `allOf`, ...) is left
 * unchanged and keeps non-strict function calling.
 */
export const toStrictToolSchemas = (tools: ToolOptions['tools']): StrictToolSchemas => {
  if (!tools) {
    return { tools, strictToolNames: [] };
  }

  const strictToolNames: string[] = [];
  const strictTools = mapValues(tools, (tool, toolName) => {
    const schema = tool.schema ?? { type: 'object' as const, properties: {} };
    try {
      const strictSchema = toStrictSchemaPart(inlineRootJsonSchemaRef(schema) as SchemaPart);
      strictToolNames.push(toolName);
      return { ...tool, schema: strictSchema as unknown as ToolSchema };
    } catch (error) {
      if (error instanceof StrictIncompatibleSchemaError) {
        return tool;
      }
      throw error;
    }
  });

  return { tools: strictTools, strictToolNames };
};

const isNullable = (schema: SchemaPart): boolean =>
  schema.type === 'null' ||
  (Array.isArray(schema.type) && schema.type.includes('null')) ||
  (schema.anyOf ?? []).some(isNullable);

const withNull = (schema: SchemaPart): SchemaPart => {
  if (isNullable(schema)) {
    return schema;
  }
  if (Array.isArray(schema.type)) {
    return { ...schema, type: [...schema.type, 'null'] };
  }
  if (schema.anyOf) {
    return { ...schema, anyOf: [...schema.anyOf, { type: 'null' }] };
  }
  const { description, ...rest } = schema;
  return {
    ...(description !== undefined ? { description } : {}),
    anyOf: [rest, { type: 'null' }],
  };
};

const toStrictSchemaPart = (source: SchemaPart): SchemaPart => {
  for (const field of STRICT_INCOMPATIBLE_FIELDS) {
    if (field in source) {
      throw new StrictIncompatibleSchemaError(field);
    }
  }

  const schema: SchemaPart = {};
  for (const [key, value] of Object.entries(source)) {
    if (STRICT_SCHEMA_FIELDS.has(key)) {
      schema[key] = value;
    }
  }

  if (typeof schema.format === 'string' && !STRICT_STRING_FORMATS.has(schema.format)) {
    delete schema.format;
  }

  if (source.oneOf) {
    schema.anyOf = [...(schema.anyOf ?? []), ...source.oneOf];
  }
  if (schema.anyOf) {
    schema.anyOf = schema.anyOf.map(toStrictSchemaPart);
  }

  const types = Array.isArray(schema.type) ? schema.type : [schema.type];
  if (types.includes('array')) {
    if (!schema.items || Array.isArray(schema.items)) {
      throw new StrictIncompatibleSchemaError('items');
    }
    schema.items = toStrictSchemaPart(schema.items);
  }

  if (types.includes('object') || schema.properties) {
    if (schema.additionalProperties !== undefined && schema.additionalProperties !== false) {
      // a map / free-form object cannot list all of its keys in `required`
      throw new StrictIncompatibleSchemaError('additionalProperties');
    }
    const properties = schema.properties ?? {};
    const required = new Set(source.required ?? []);
    schema.properties = mapValues(properties, (property, key) => {
      const strictProperty = toStrictSchemaPart(property);
      return required.has(key) ? strictProperty : withNull(strictProperty);
    });
    schema.required = Object.keys(properties);
    schema.additionalProperties = false;
  }

  if (schema.$defs) {
    schema.$defs = mapValues(schema.$defs, toStrictSchemaPart);
  }

  return schema;
};
