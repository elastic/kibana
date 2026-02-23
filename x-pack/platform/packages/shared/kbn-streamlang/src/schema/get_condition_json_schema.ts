/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { zodToJsonSchema } from 'zod-to-json-schema';
import { conditionSchema } from '../../types/conditions';

/**
 * JSON Schema type for the condition schema output.
 */
export type ConditionJsonSchema = ReturnType<typeof zodToJsonSchema>;

/**
 * Generate a JSON Schema from the condition Zod schema for use with Monaco YAML validation.
 *
 * This function converts the `conditionSchema` from Zod to JSON Schema format,
 * which can be used by Monaco YAML to provide:
 * - Schema-based autocompletions
 * - Inline validation
 * - Hover information
 *
 * @returns The JSON Schema representation of the condition schema
 */
export function getConditionJsonSchema(): ConditionJsonSchema {
  const jsonSchema = zodToJsonSchema(conditionSchema, {
    name: 'ConditionSchema',
    target: 'jsonSchema7',
  });

  // Apply fixes similar to the streamlang schema generator
  return fixConditionSchema(jsonSchema);
}

/**
 * Apply fixes to the generated JSON Schema to ensure compatibility with Monaco YAML.
 */
function fixConditionSchema(schema: any): any {
  const schemaString = JSON.stringify(schema);
  let fixedSchemaString = schemaString;

  // Fix 1: Remove duplicate enum values
  fixedSchemaString = fixedSchemaString.replace(/"enum":\s*\[([^\]]+)\]/g, (match, enumValues) => {
    try {
      const values = JSON.parse(`[${enumValues}]`);
      const uniqueValues = [...new Set(values)];
      return `"enum":${JSON.stringify(uniqueValues)}`;
    } catch (e) {
      return match;
    }
  });

  try {
    const fixedSchema = JSON.parse(fixedSchemaString);
    fixAdditionalPropertiesInSchema(fixedSchema);
    return fixedSchema;
  } catch (parseError) {
    throw new Error('Failed to fix condition JSON schema');
  }
}

/**
 * Recursively fix additionalProperties in the schema object.
 * This ensures all object schemas have additionalProperties: false for strict validation.
 */
function fixAdditionalPropertiesInSchema(obj: any, path: string = '', visited = new Set()): void {
  if (typeof obj !== 'object' || obj === null || visited.has(obj)) {
    return;
  }
  visited.add(obj);

  if (Array.isArray(obj)) {
    obj.forEach((item, index) =>
      fixAdditionalPropertiesInSchema(item, `${path}[${index}]`, visited)
    );
    return;
  }

  // For objects with type: "object", which don't have additionalProperties, set it to false
  if (obj.type === 'object' && !('additionalProperties' in obj)) {
    obj.additionalProperties = false;
  }

  // Remove additionalProperties: false from objects inside allOf arrays
  if (obj.type === 'object' && obj.additionalProperties === false) {
    const pathParts = path.split('.');
    const isInAllOf = pathParts.some((part, index) => {
      return part === 'allOf' && pathParts[index + 1] && /^\d+$/.test(pathParts[index + 1]);
    });

    if (isInAllOf) {
      delete obj.additionalProperties;
    }
  }

  // Recursively process all properties
  Object.keys(obj).forEach((key) => {
    fixAdditionalPropertiesInSchema(obj[key], path ? `${path}.${key}` : key, visited);
  });
}

/**
 * Get Monaco YAML schema configuration for the condition editor.
 *
 * @returns Schema configuration object for monaco-yaml, or null if generation fails
 */
export function getConditionMonacoSchemaConfig(): {
  uri: string;
  fileMatch: string[];
  schema: object;
} | null {
  try {
    const schema = getConditionJsonSchema();
    return {
      uri: 'http://elastic.co/schemas/condition.json',
      fileMatch: ['*'],
      schema: schema as object,
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('Failed to generate condition JSON schema:', error);
    return null;
  }
}
