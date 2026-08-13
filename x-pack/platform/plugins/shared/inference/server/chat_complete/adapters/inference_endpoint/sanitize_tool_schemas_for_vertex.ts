/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapValues } from 'lodash';
import type { ToolOptions, ToolSchemaType } from '@kbn/inference-common';

export const sanitizeToolSchemasForVertex = (tools: ToolOptions['tools']): ToolOptions['tools'] => {
  if (!tools) {
    return tools;
  }

  return mapValues(tools, (tool) => ({
    ...tool,
    schema: tool.schema ? toVertexSchema(tool.schema) : undefined,
  }));
};

/**
 * Fields of Vertex AI's function declaration schema, "a select subset of an
 * OpenAPI 3.0 schema object". Any other field is rejected with a 400.
 * https://github.com/googleapis/googleapis/blob/master/google/cloud/aiplatform/v1/openapi.proto
 */
const VERTEX_SCHEMA_FIELDS = new Set([
  'type',
  'format',
  'title',
  'description',
  'nullable',
  'default',
  'items',
  'minItems',
  'maxItems',
  'enum',
  'properties',
  'propertyOrdering',
  'required',
  'minProperties',
  'maxProperties',
  'minimum',
  'maximum',
  'minLength',
  'maxLength',
  'pattern',
  'example',
  'anyOf',
  'additionalProperties',
]);

/**
 * `ToolSchemaType` does not model everything zod v4 emits, so the
 * conversion operates on this loose representation.
 */
interface SchemaPart {
  [key: string]: unknown;
  const?: unknown;
  type?: string;
  nullable?: boolean;
  enum?: unknown[];
  properties?: Record<string, ToolSchemaType>;
  items?: ToolSchemaType;
  additionalProperties?: ToolSchemaType | boolean;
  anyOf?: ToolSchemaType[];
  oneOf?: ToolSchemaType[];
}

/**
 * Rebuilds a tool schema keeping only the fields Vertex AI accepts, so that
 * JSON Schema keywords zod v4 (or user-provided tool schemas) emit never reach
 * Vertex's parser. Conversions preserve the intent of dropped fields:
 * `const: 'x'` becomes `enum: ['x']`, `oneOf` branches become `anyOf`, and a
 * `null` branch in `anyOf` (zod's representation of nullable values) becomes
 * `nullable: true`.
 */
const toVertexSchema = <T extends ToolSchemaType>(schemaPart: T): T => {
  const source = schemaPart as SchemaPart;
  const schema: SchemaPart = {};

  for (const [key, value] of Object.entries(source)) {
    if (VERTEX_SCHEMA_FIELDS.has(key)) {
      schema[key] = value;
    }
  }

  if (typeof source.const === 'string' && schema.enum === undefined) {
    schema.enum = [source.const];
  }

  if (source.oneOf) {
    schema.anyOf = [...(schema.anyOf ?? []), ...source.oneOf];
  }

  if (schema.properties) {
    schema.properties = mapValues(schema.properties, toVertexSchema);
  }
  if (schema.items) {
    schema.items = toVertexSchema(schema.items);
  }
  if (typeof schema.additionalProperties === 'object') {
    schema.additionalProperties = toVertexSchema(schema.additionalProperties);
  }
  if (schema.anyOf) {
    const branches = schema.anyOf.map(toVertexSchema);
    const nonNullBranches = branches.filter((branch) => (branch as SchemaPart).type !== 'null');

    if (nonNullBranches.length === branches.length) {
      schema.anyOf = branches;
    } else {
      schema.nullable = true;
      if (nonNullBranches.length === 1) {
        delete schema.anyOf;
        Object.assign(schema, nonNullBranches[0]);
      } else {
        schema.anyOf = nonNullBranches;
      }
    }
  }

  return schema as unknown as T;
};
