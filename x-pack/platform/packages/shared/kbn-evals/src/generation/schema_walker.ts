/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Example } from '../types';

/**
 * Subset of JSON Schema properties used by the walker.
 * Compatible with the output of zod/v4/core/json-schema.
 */
export interface JSONSchema {
  type?: string | string[];
  properties?: Record<string, JSONSchema>;
  required?: string[];
  items?: JSONSchema | JSONSchema[];
  enum?: unknown[];
  oneOf?: JSONSchema[];
  anyOf?: JSONSchema[];
  const?: unknown;
  default?: unknown;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  minItems?: number;
  maxItems?: number;
  description?: string;
}

export type Difficulty = 'simple' | 'moderate' | 'complex';

export interface GenerateConfig {
  count: number;
  difficulty: Difficulty;
}

const resolveType = (schema: JSONSchema): string | undefined => {
  if (typeof schema.type === 'string') return schema.type;
  if (Array.isArray(schema.type) && schema.type.length > 0) return schema.type[0];
  return undefined;
};

const randomInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const generateString = (schema: JSONSchema, difficulty: Difficulty): string => {
  if (schema.enum && schema.enum.length > 0) {
    const idx = randomInt(0, schema.enum.length - 1);
    return String(schema.enum[idx]);
  }
  const minLen = schema.minLength ?? 1;
  const maxLen = schema.maxLength ?? (difficulty === 'complex' ? 200 : 20);
  const len = difficulty === 'simple' ? Math.max(minLen, 5) : randomInt(minLen, maxLen);
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  return Array.from({ length: len }, () => chars[randomInt(0, chars.length - 1)]).join('');
};

const generateNumber = (schema: JSONSchema, difficulty: Difficulty): number => {
  const min = schema.minimum ?? (difficulty === 'complex' ? -1e6 : 0);
  const max = schema.maximum ?? (difficulty === 'complex' ? 1e6 : 100);

  switch (difficulty) {
    case 'simple':
      return randomInt(Math.max(0, Math.ceil(min)), Math.min(100, Math.floor(max)));
    case 'moderate': {
      const r = Math.random();
      if (r < 0.3 && schema.minimum !== undefined) return schema.minimum;
      if (r < 0.6 && schema.maximum !== undefined) return schema.maximum;
      return randomInt(Math.ceil(min), Math.floor(max));
    }
    case 'complex':
      // Include negative, zero, extreme values
      if (Math.random() < 0.2) return 0;
      if (Math.random() < 0.2 && min < 0) return randomInt(Math.ceil(min), -1);
      return randomInt(Math.ceil(min), Math.floor(max));
  }
};

const generateBoolean = (_schema: JSONSchema, difficulty: Difficulty): boolean => {
  if (difficulty === 'simple') return true;
  return Math.random() < 0.5;
};

/**
 * Recursively generate a value conforming to the given JSON Schema.
 */
const generateValue = (schema: JSONSchema, difficulty: Difficulty, depth: number = 0): unknown => {
  if (!schema || typeof schema !== 'object') return null;
  if (depth > 10) return null;

  if (schema.const !== undefined) return schema.const;

  if (schema.enum && schema.enum.length > 0) {
    return schema.enum[randomInt(0, schema.enum.length - 1)];
  }

  if (schema.oneOf && schema.oneOf.length > 0) {
    const variant = schema.oneOf[randomInt(0, schema.oneOf.length - 1)];
    return generateValue(variant, difficulty, depth + 1);
  }

  if (schema.anyOf && schema.anyOf.length > 0) {
    const variant = schema.anyOf[randomInt(0, schema.anyOf.length - 1)];
    return generateValue(variant, difficulty, depth + 1);
  }

  const type = resolveType(schema);

  switch (type) {
    case 'string':
      return generateString(schema, difficulty);
    case 'number':
    case 'integer':
      return generateNumber(schema, difficulty);
    case 'boolean':
      return generateBoolean(schema, difficulty);
    case 'array':
      return generateArray(schema, difficulty, depth);
    case 'object':
      return generateObject(schema, difficulty, depth);
    default:
      if (schema.properties) return generateObject(schema, difficulty, depth);
      return null;
  }
};

const generateArray = (schema: JSONSchema, difficulty: Difficulty, depth: number): unknown[] => {
  const minItems = schema.minItems ?? 0;
  const maxByDifficulty = difficulty === 'complex' ? 10 : difficulty === 'moderate' ? 5 : 2;
  const maxItems = schema.maxItems ?? maxByDifficulty;
  const count = difficulty === 'simple' ? Math.max(minItems, 1) : randomInt(minItems, maxItems);
  const itemSchema = Array.isArray(schema.items) ? schema.items[0] : schema.items;

  if (!itemSchema) return Array.from({ length: count }, () => null);
  return Array.from({ length: count }, () => generateValue(itemSchema, difficulty, depth + 1));
};

const generateObject = (
  schema: JSONSchema,
  difficulty: Difficulty,
  depth: number
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  const properties = schema.properties ?? {};
  const required = new Set(schema.required ?? []);

  for (const [key, propSchema] of Object.entries(properties)) {
    const isRequired = required.has(key);

    if (!isRequired && difficulty === 'moderate' && Math.random() < 0.4) {
      continue;
    }

    if (!isRequired && difficulty === 'complex' && Math.random() < 0.3) {
      continue;
    }

    if (depth > 5) {
      result[key] = null;
      continue;
    }

    result[key] = generateValue(propSchema, difficulty, depth + 1);
  }

  return result;
};

/**
 * Walk a JSON Schema and generate synthetic Example inputs.
 *
 * Handles string, number, boolean, object, array, enum, oneOf/anyOf.
 * Difficulty levels control boundary conditions and edge-case coverage:
 * - `simple`: happy-path defaults
 * - `moderate`: boundary values, optional fields omitted
 * - `complex`: nested objects, large arrays, edge cases
 */
export const generateTestsFromToolSchema = (
  toolSchema: JSONSchema,
  config: GenerateConfig
): Example[] => {
  return Array.from({ length: config.count }, () => {
    const input = generateValue(toolSchema, config.difficulty) as Record<string, unknown>;
    return { input };
  });
};
