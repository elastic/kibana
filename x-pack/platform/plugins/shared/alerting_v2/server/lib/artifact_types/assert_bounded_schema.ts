/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MAX_ARTIFACT_ARRAY_ITEMS,
  MAX_ARTIFACT_DATA_BYTES,
  MAX_ARTIFACT_STRING_LENGTH,
} from '@kbn/alerting-v2-constants';
import { z } from '@kbn/zod/v4';

type JsonSchemaNode = Record<string, unknown>;

/**
 * Converts a Zod `dataSchema` to JSON Schema and rejects unbounded / oversized
 * constructs. Called once at `registerArtifactType`; never at request time.
 */
export function assertBoundedSchema(dataSchema: z.ZodType, typeName: string): void {
  let json: JsonSchemaNode;
  try {
    // `input` io bounds what a client may send, and is the only mode that tells a
    // stripping `z.object()` (no `additionalProperties`) apart from a closed
    // `.strict()` one (`additionalProperties: false`). Under `output` io both emit
    // `false`, so a stripping object would register while silently accepting — and
    // persisting, since the raw `data` is stored — undeclared fields.
    json = z.toJSONSchema(dataSchema, { io: 'input' }) as JsonSchemaNode;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Artifact type "${typeName}" dataSchema cannot be converted to JSON Schema: ${message}`
    );
  }

  const worstCaseBytes = assertBoundedNode(json, 'data', typeName, new Set());
  if (worstCaseBytes > MAX_ARTIFACT_DATA_BYTES) {
    throw new Error(
      `Artifact type "${typeName}" dataSchema worst-case size ${worstCaseBytes} exceeds framework cap ${MAX_ARTIFACT_DATA_BYTES}`
    );
  }
}

function assertBoundedNode(
  node: JsonSchemaNode,
  path: string,
  typeName: string,
  seen: Set<JsonSchemaNode>
): number {
  if (seen.has(node)) {
    throw new Error(
      `Artifact type "${typeName}" dataSchema at ${path} is recursive; recursive schemas are not supported`
    );
  }
  seen.add(node);

  if (typeof node.$ref === 'string') {
    throw new Error(
      `Artifact type "${typeName}" dataSchema at ${path} uses $ref; recursive / deferred schemas are not supported`
    );
  }

  // Zod maps z.any() / z.unknown() to unconstrained {} (no type).
  if (node.type === undefined && !hasCombinator(node) && node.properties === undefined) {
    throw new Error(
      `Artifact type "${typeName}" dataSchema at ${path} is unconstrained (z.any / z.unknown are not allowed)`
    );
  }

  if (hasCombinator(node)) {
    throw new Error(
      `Artifact type "${typeName}" dataSchema at ${path} uses combinators (anyOf/oneOf/allOf/not); not supported`
    );
  }

  const type = node.type;
  if (type === 'string') {
    return assertBoundedString(node, path, typeName);
  }
  if (type === 'array') {
    return assertBoundedArray(node, path, typeName, seen);
  }
  if (type === 'object') {
    return assertBoundedObject(node, path, typeName, seen);
  }
  if (type === 'number' || type === 'integer' || type === 'boolean' || type === 'null') {
    // Fixed-width JSON tokens; charge a small constant.
    return 16;
  }

  throw new Error(
    `Artifact type "${typeName}" dataSchema at ${path} has unsupported JSON Schema type ${String(
      type
    )}`
  );
}

function hasCombinator(node: JsonSchemaNode): boolean {
  return (
    node.anyOf !== undefined ||
    node.oneOf !== undefined ||
    node.allOf !== undefined ||
    node.not !== undefined
  );
}

function assertBoundedString(node: JsonSchemaNode, path: string, typeName: string): number {
  const maxLength = node.maxLength;
  if (typeof maxLength !== 'number') {
    throw new Error(
      `Artifact type "${typeName}" dataSchema at ${path}: string is missing maxLength`
    );
  }
  if (maxLength > MAX_ARTIFACT_STRING_LENGTH) {
    throw new Error(
      `Artifact type "${typeName}" dataSchema at ${path}: maxLength ${maxLength} exceeds framework cap ${MAX_ARTIFACT_STRING_LENGTH}`
    );
  }
  // Quote characters + content.
  return maxLength + 2;
}

function assertBoundedArray(
  node: JsonSchemaNode,
  path: string,
  typeName: string,
  seen: Set<JsonSchemaNode>
): number {
  const maxItems = node.maxItems;
  if (typeof maxItems !== 'number') {
    throw new Error(`Artifact type "${typeName}" dataSchema at ${path}: array is missing maxItems`);
  }
  if (maxItems > MAX_ARTIFACT_ARRAY_ITEMS) {
    throw new Error(
      `Artifact type "${typeName}" dataSchema at ${path}: maxItems ${maxItems} exceeds framework cap ${MAX_ARTIFACT_ARRAY_ITEMS}`
    );
  }

  const items = node.items;
  if (items === undefined || typeof items !== 'object' || Array.isArray(items)) {
    throw new Error(
      `Artifact type "${typeName}" dataSchema at ${path}: array items must be a single bounded schema`
    );
  }

  const elementBytes = assertBoundedNode(items as JsonSchemaNode, `${path}[]`, typeName, seen);
  // '[' ']' and commas between elements
  return 2 + maxItems * elementBytes + Math.max(0, maxItems - 1);
}

function assertBoundedObject(
  node: JsonSchemaNode,
  path: string,
  typeName: string,
  seen: Set<JsonSchemaNode>
): number {
  if (node.additionalProperties !== false) {
    throw new Error(
      `Artifact type "${typeName}" dataSchema at ${path}: object must be closed (use .strict(); additionalProperties must be false)`
    );
  }

  // Unbounded records use additionalProperties: <schema> rather than false.
  // The check above already rejects those.

  const properties = (node.properties ?? {}) as Record<string, JsonSchemaNode>;
  let total = 2; // `{` `}`
  let first = true;
  for (const [key, child] of Object.entries(properties)) {
    const childBytes = assertBoundedNode(child, `${path}.${key}`, typeName, seen);
    const keyBytes = key.length + 2; // quoted key
    total += (first ? 0 : 1) + keyBytes + 1 + childBytes; // comma + "key":value
    first = false;
  }
  return total;
}
