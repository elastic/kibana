/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { zodToJsonSchema } from 'zod-to-json-schema';
import { createRuleDataSchema } from '../../../common/schemas/create_rule_data_schema';
import type { JsonSchema, SchemaPropertyInfo } from './types';

/**
 * Cached JSON schema converted from Zod
 */
let cachedJsonSchema: JsonSchema | null = null;

/**
 * Get the JSON schema for the rule data, converting from Zod and caching the result
 */
export const getJsonSchema = (): JsonSchema => {
  if (!cachedJsonSchema) {
    cachedJsonSchema = zodToJsonSchema(createRuleDataSchema, {
      $refStrategy: 'none',
      errorMessages: true,
    }) as JsonSchema;
  }
  return cachedJsonSchema;
};

/**
 * Resolve anyOf/oneOf/allOf to get the actual schema (handles optionals, unions, etc.)
 */
export const resolveSchema = (schema: JsonSchema): JsonSchema => {
  if (schema.anyOf) {
    const nonNull = schema.anyOf.find(
      (s) => s.type !== 'null' && !(Array.isArray(s.type) && s.type.includes('null'))
    );
    if (nonNull) return resolveSchema(nonNull);
    return schema.anyOf[0] ? resolveSchema(schema.anyOf[0]) : schema;
  }
  if (schema.oneOf) {
    const nonNull = schema.oneOf.find(
      (s) => s.type !== 'null' && !(Array.isArray(s.type) && s.type.includes('null'))
    );
    if (nonNull) return resolveSchema(nonNull);
    return schema.oneOf[0] ? resolveSchema(schema.oneOf[0]) : schema;
  }
  if (schema.allOf && schema.allOf.length === 1) {
    return resolveSchema(schema.allOf[0]);
  }
  return schema;
};

/**
 * Get JSON schema node at a given path
 */
export const getSchemaNode = (path: Array<string | number>): JsonSchema | undefined => {
  let current: JsonSchema = getJsonSchema();

  for (const segment of path) {
    current = resolveSchema(current);

    if (typeof segment === 'number') {
      if (current.items) {
        current = current.items;
        continue;
      }
      return undefined;
    }

    if (current.properties && segment in current.properties) {
      current = current.properties[segment];
      continue;
    }

    return undefined;
  }

  return current;
};

/**
 * Get the type from a JSON schema
 */
export const getSchemaType = (schema: JsonSchema): SchemaPropertyInfo['type'] => {
  const resolved = resolveSchema(schema);
  const type = Array.isArray(resolved.type) ? resolved.type[0] : resolved.type;

  switch (type) {
    case 'string':
      return 'string';
    case 'number':
    case 'integer':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'array':
      return 'array';
    case 'object':
      return 'object';
    default:
      return 'unknown';
  }
};

/**
 * Format type for display (e.g., "string", "number", "array<string>", etc.)
 */
const formatTypeForDisplay = (schema: JsonSchema): string => {
  const resolved = resolveSchema(schema);
  const baseType = Array.isArray(resolved.type) ? resolved.type[0] : resolved.type;

  if (resolved.enum) {
    const enumValues = resolved.enum as Array<string | number | boolean>;
    if (enumValues.length <= 3) {
      return enumValues.map((v) => (typeof v === 'string' ? `"${v}"` : String(v))).join(' | ');
    }
    return `enum (${enumValues.length} values)`;
  }

  if (baseType === 'array' && resolved.items) {
    const itemType = formatTypeForDisplay(resolved.items);
    return `${itemType}[]`;
  }

  return baseType ?? 'unknown';
};

/**
 * Get properties from JSON schema at a given path
 */
export const getSchemaProperties = (path: string[]): SchemaPropertyInfo[] => {
  const node = getSchemaNode(path);
  if (!node) return [];

  const resolved = resolveSchema(node);
  if (!resolved.properties) return [];

  return Object.entries(resolved.properties).map(([key, propSchema]) => {
    const resolvedProp = resolveSchema(propSchema);
    const type = formatTypeForDisplay(propSchema);
    const isEnum = Boolean(resolvedProp.enum);
    const enumValues = isEnum ? (resolvedProp.enum as string[]) : undefined;

    return {
      key,
      description: propSchema.description ?? resolvedProp.description,
      type,
      isEnum,
      enumValues,
    };
  });
};

/**
 * Get schema description at a given path
 */
export const getSchemaDescription = (path: string[]): string | undefined => {
  const node = getSchemaNode(path);
  if (!node) return undefined;
  const resolved = resolveSchema(node);
  return node.description ?? resolved.description;
};

/**
 * Get full property info at a given path (for hover)
 */
export const getSchemaPropertyInfo = (
  path: string[]
): { type: string; description?: string; enumValues?: string[] } | undefined => {
  const node = getSchemaNode(path);
  if (!node) return undefined;

  const resolved = resolveSchema(node);
  const type = formatTypeForDisplay(node);
  const description = node.description ?? resolved.description;
  const enumValues = resolved.enum ? (resolved.enum as string[]) : undefined;

  return { type, description, enumValues };
};

/**
 * Get schema type info at a given path (for value completions)
 */
export const getSchemaTypeInfo = (
  path: string[]
): { type: string; isBoolean: boolean; enumValues?: string[] } | undefined => {
  const node = getSchemaNode(path);
  if (!node) return undefined;

  const resolved = resolveSchema(node);
  const type = Array.isArray(resolved.type) ? resolved.type[0] : resolved.type;

  if (type === 'boolean') {
    return { type: 'boolean', isBoolean: true };
  }
  if (resolved.enum) {
    return { type: 'enum', isBoolean: false, enumValues: resolved.enum as string[] };
  }

  return { type: type ?? 'unknown', isBoolean: false };
};
