/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Message, ToolSchemaType } from '@kbn/inference-common';
import { inlineRootJsonSchemaRef } from '@kbn/zod/v4';
import { MessageRole, ToolChoiceType, type ToolOptions } from '@kbn/inference-common';
import type { ToolChoice as ConverseBedRockToolChoice } from '@aws-sdk/client-bedrock-runtime';

export const toolChoiceToConverse = (
  toolChoice: ToolOptions['toolChoice']
): ConverseBedRockToolChoice | undefined => {
  if (toolChoice === ToolChoiceType.required) {
    return { any: {} };
  } else if (toolChoice === ToolChoiceType.auto) {
    return { auto: {} };
  } else if (typeof toolChoice === 'object') {
    return { tool: { name: toolChoice.function } };
  }
  // ToolChoiceType.none is not supported by claude
  // we are adding a directive to the system instructions instead in that case.
  return undefined;
};

export const toolsToConverseBedrock = (tools: ToolOptions['tools'], messages: Message[]) => {
  if (tools) {
    return Object.entries(tools).map(([toolName, toolDef]) => {
      return {
        toolSpec: {
          name: toolName,
          description: toolDef.description,
          inputSchema: {
            json: fixSchemaArrayProperties(
              toolDef.schema ?? {
                type: 'object' as const,
                properties: {},
              }
            ),
          },
        },
      };
    });
  }

  const hasToolUse = messages.filter(
    (message) =>
      message.role === MessageRole.Tool ||
      (message.role === MessageRole.Assistant && message.toolCalls?.length)
  );

  if (hasToolUse) {
    return [
      {
        toolSpec: {
          name: 'do_not_call_this_tool',
          description: 'Do not call this tool, it is strictly forbidden',
          inputSchema: {
            json: {
              type: 'object',
              properties: {},
            },
          },
        },
      },
    ];
  }
};

/**
 * Strips JSON Schema keywords that are not supported by the
 * Bedrock Converse API. According to AWS documentation:
 *  - `propertyNames` is not supported
 *  - `additionalProperties` is not supported for object types
 *  - `$schema` is not supported
 *
 * Also ensures object-typed schemas always have a `properties`
 * field, which the Converse API requires for object types.
 */
function stripUnsupportedSchemaKeywords<T extends ToolSchemaType>(schemaPart: T): T {
  const {
    propertyNames: _propertyNames,
    additionalProperties: _additionalProperties,
    $schema: _$schema,
    ...rest
  } = schemaPart as unknown as Record<string, unknown>;

  // Bedrock requires `properties` on object types
  if (rest.type === 'object' && !rest.properties) {
    rest.properties = {};
  }

  return rest as unknown as T;
}

const SCHEMA_OBJECT_MAP_KEYS = new Set([
  'properties',
  'patternProperties',
  '$defs',
  'definitions',
  'dependentSchemas',
]);

const SCHEMA_ARRAY_KEYS = new Set(['prefixItems', 'anyOf', 'oneOf', 'allOf']);

const SCHEMA_SINGLE_KEYS = new Set(['not', 'propertyNames', 'contains', 'if', 'then', 'else']);

/** JSON Schema keywords that apply to a single `type` and belong on that branch when splitting `type` arrays. */
const TYPE_SPECIFIC_KEYS = new Set([
  'properties',
  'required',
  'additionalProperties',
  'minProperties',
  'maxProperties',
  'propertyNames',
  'dependentRequired',
  'dependentSchemas',
  'items',
  'prefixItems',
  'contains',
  'minItems',
  'maxItems',
  'unevaluatedItems',
  'minLength',
  'maxLength',
  'pattern',
  'format',
  'contentEncoding',
  'contentMediaType',
  'minimum',
  'maximum',
  'exclusiveMinimum',
  'exclusiveMaximum',
  'multipleOf',
  'enum',
]);

const expandSchemaRecord = (record: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(record).map(([key, value]) => [
      key,
      expandJsonSchemaTypeArraysToAnyOfNode(value),
    ])
  );

/**
 * Rewrites JSON Schema `type` arrays (emitted by zod >= 4.5) into `anyOf` branches that include
 * `{ type: 'null' }`, matching zod 4.4.x `toJSONSchema` output for Bedrock / Anthropic tool schemas.
 */
const expandJsonSchemaTypeArraysToAnyOfNode = (value: unknown): unknown => {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value;
  }

  const input = value as Record<string, unknown>;
  const node: Record<string, unknown> = {};

  for (const [key, entry] of Object.entries(input)) {
    if (
      SCHEMA_OBJECT_MAP_KEYS.has(key) &&
      entry !== null &&
      typeof entry === 'object' &&
      !Array.isArray(entry)
    ) {
      node[key] = expandSchemaRecord(entry as Record<string, unknown>);
      continue;
    }

    if (
      key === 'additionalProperties' &&
      entry !== null &&
      typeof entry === 'object' &&
      !Array.isArray(entry)
    ) {
      node[key] = expandJsonSchemaTypeArraysToAnyOfNode(entry);
      continue;
    }

    if (key === 'items') {
      node[key] = Array.isArray(entry)
        ? entry.map((item) => expandJsonSchemaTypeArraysToAnyOfNode(item))
        : expandJsonSchemaTypeArraysToAnyOfNode(entry);
      continue;
    }

    if (SCHEMA_ARRAY_KEYS.has(key) && Array.isArray(entry)) {
      node[key] = entry.map((item) => expandJsonSchemaTypeArraysToAnyOfNode(item));
      continue;
    }

    if (SCHEMA_SINGLE_KEYS.has(key)) {
      node[key] = expandJsonSchemaTypeArraysToAnyOfNode(entry);
      continue;
    }

    node[key] = entry;
  }

  return applyTypeArrayExpansion(node);
};

const applyTypeArrayExpansion = (node: Record<string, unknown>): Record<string, unknown> => {
  const typeValue = node.type;
  if (!Array.isArray(typeValue) || !typeValue.every((entry) => typeof entry === 'string')) {
    return expandOpenApiNullable(node);
  }

  const types = typeValue as string[];
  const hadNull = types.includes('null');
  const nonNullTypes = types.filter((entry) => entry !== 'null');
  const { type: _type, nullable: _nullable, ...rest } = node;

  if (nonNullTypes.length === 0) {
    return { ...rest, type: 'null' };
  }

  const typeSpecific: Record<string, unknown> = {};
  const shared: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(rest)) {
    if (TYPE_SPECIFIC_KEYS.has(key)) {
      typeSpecific[key] = entry;
    } else {
      shared[key] = entry;
    }
  }

  const singleTypeBranch = (schemaType: string): Record<string, unknown> => ({
    type: schemaType,
    ...(nonNullTypes.length === 1 ? typeSpecific : {}),
  });

  const nonNullSchema =
    nonNullTypes.length === 1
      ? singleTypeBranch(nonNullTypes[0])
      : { anyOf: nonNullTypes.map((schemaType) => singleTypeBranch(schemaType)) };

  if (!hadNull) {
    if (nonNullTypes.length === 1) {
      return { ...shared, ...nonNullSchema };
    }
    return { ...shared, anyOf: nonNullTypes.map((schemaType) => singleTypeBranch(schemaType)) };
  }

  return {
    ...shared,
    anyOf: [nonNullSchema, { type: 'null' }],
  };
};

/** Converts OpenAPI-style `nullable: true` (not understood by Bedrock) into explicit null branches. */
const expandOpenApiNullable = (node: Record<string, unknown>): Record<string, unknown> => {
  if (node.nullable !== true) {
    return node;
  }

  const { nullable: _nullable, type, ...rest } = node;
  if (typeof type !== 'string') {
    return node;
  }

  const { anyOf, ...restWithoutAnyOf } = rest;
  if (anyOf !== undefined) {
    return {
      ...restWithoutAnyOf,
      anyOf: [{ anyOf }, { type: 'null' }],
    };
  }

  const typeSpecific: Record<string, unknown> = {};
  const shared: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(restWithoutAnyOf)) {
    if (TYPE_SPECIFIC_KEYS.has(key)) {
      typeSpecific[key] = entry;
    } else {
      shared[key] = entry;
    }
  }

  return {
    ...shared,
    anyOf: [{ type, ...typeSpecific }, { type: 'null' }],
  };
};

const expandJsonSchemaTypeArraysToAnyOf = <T>(schema: T): T =>
  expandJsonSchemaTypeArraysToAnyOfNode(schema) as T;

/**
 * Claude is prone to ignoring the "array" part of an array type,
 * so this function patches it to add a message on each
 * array property to explicitly state that the value should
 * be returned as a json array.
 *
 * Also strips JSON Schema keywords unsupported by Bedrock
 * (e.g. `propertyNames`, `additionalProperties`).
 */
export function fixSchemaArrayProperties<T extends ToolSchemaType>(schemaPart: T): T {
  return fixSchemaArrayPropertiesPart(
    expandJsonSchemaTypeArraysToAnyOf(inlineRootJsonSchemaRef(schemaPart)) as T
  );
}

function fixSchemaArrayPropertiesPart<T extends ToolSchemaType>(schemaPart: T): T {
  const cleaned = stripUnsupportedSchemaKeywords(schemaPart);

  if (cleaned.type === 'object' && cleaned.properties) {
    return {
      ...cleaned,
      properties: Object.fromEntries(
        Object.entries(cleaned.properties).map(([key, childSchemaPart]) => {
          return [key, fixSchemaArrayPropertiesPart(childSchemaPart)];
        })
      ),
    };
  }

  if (cleaned.type === 'array') {
    return {
      ...cleaned,
      // Claude is prone to ignoring the "array" part of an array type
      description: cleaned.description
        ? `${cleaned.description}. Must be provided as a JSON array`
        : 'Must be provided as a JSON array',
      items: cleaned.items ? fixSchemaArrayPropertiesPart(cleaned.items) : {},
    };
  }

  return cleaned;
}
