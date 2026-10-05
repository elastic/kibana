/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

/**
 * Matches descriptions that carry constraint or usage info worth keeping
 * in the LLM prompt (numbers, ranges, defaults, examples, units).
 * Everything else (e.g. "Label for the operation") is stripped to save tokens.
 */
const USEFUL_DESCRIPTION_RE =
  /(\d|default|e\.g\.|i\.e\.|example|must|between|minimum|maximum|at least|at most|up to|pixels|millisecond|factor|typical|legacy|truncat)/i;

const DEF_REF_PREFIX = '#/$defs/';

export type JsonNode = Record<string, unknown>;

export const isJsonNode = (value: unknown): value is JsonNode =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/** Copies a JSON schema without the descriptions that carry no constraint or usage info. */
const trimSchemaDescriptions = <T>(schema: T): T =>
  JSON.parse(JSON.stringify(schema), (key, value) =>
    key === 'description' && typeof value === 'string' && !USEFUL_DESCRIPTION_RE.test(value)
      ? undefined
      : value
  );

export const UNION_KEYS = ['anyOf', 'oneOf'] as const;

/** Subschemas a node combines under the given keys, e.g. the members of an `anyOf` union. */
export const getSubschemas = (node: JsonNode, keys: readonly string[]): unknown[] =>
  keys.flatMap((key) => {
    const subschemas = node[key];
    return Array.isArray(subschemas) ? subschemas : [];
  });

export const resolveRef = (node: unknown, defs: JsonNode): unknown => {
  let current = node;
  const seen = new Set<string>();
  while (isJsonNode(current) && typeof current.$ref === 'string' && !seen.has(current.$ref)) {
    seen.add(current.$ref);
    current = defs[current.$ref.slice(DEF_REF_PREFIX.length)];
  }
  return current;
};

/** The JSON schema of a zod object's input, without descriptions that carry no constraint or usage info. */
export const toJsonSchema = (schema: z.ZodObject) =>
  trimSchemaDescriptions(z.toJSONSchema(schema, { io: 'input' })) as {
    properties?: JsonNode;
    $defs?: JsonNode;
  };
