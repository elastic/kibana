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

/** Framework ceilings a registered schema is checked against. */
export interface BoundedSchemaLimits {
  /** Ceiling for any single string's `maxLength`. */
  stringLength: number;
  /** Ceiling for any array's `maxItems`. */
  arrayItems: number;
  /** Ceiling for the worst-case serialized size the schema implies. */
  totalBytes: number;
}

/**
 * How the checked schema is named in error messages. Defaults describe an
 * artifact `dataSchema`, so artifact errors read exactly as before.
 */
export interface BoundedSchemaSubject {
  /** Kind of registration, e.g. `Artifact type` or `Builder type`. */
  kind?: string;
  /** Property holding the schema, e.g. `dataSchema`. */
  schemaProperty?: string;
  /** Root path in messages, i.e. the validated field, e.g. `data`. */
  rootPath?: string;
  limits?: BoundedSchemaLimits;
}

const ARTIFACT_SUBJECT: Required<BoundedSchemaSubject> = {
  kind: 'Artifact type',
  schemaProperty: 'dataSchema',
  rootPath: 'data',
  limits: {
    stringLength: MAX_ARTIFACT_STRING_LENGTH,
    arrayItems: MAX_ARTIFACT_ARRAY_ITEMS,
    totalBytes: MAX_ARTIFACT_DATA_BYTES,
  },
};

/** Message prefix shared by every failure, e.g. `Artifact type "host" dataSchema`. */
type Ctx = Required<BoundedSchemaSubject> & { typeName: string };

const prefix = (ctx: Ctx): string => `${ctx.kind} "${ctx.typeName}" ${ctx.schemaProperty}`;

/**
 * Converts a registered Zod schema to JSON Schema and rejects unbounded /
 * oversized constructs. Called once at registration; never at request time, so
 * downstream validation can trust that every registered schema is bounded.
 *
 * Supported subset: `.strict()` objects, strings with `.max()`, arrays with
 * `.max()`, numbers, booleans, literals and enums (`z.literal`, `z.enum`), and
 * unions (`z.union`, `.nullable()`, emitted as anyOf/oneOf). Intersections
 * (`allOf`), negations (`not`), recursion, and `z.any` / `z.unknown` are
 * rejected.
 */
export function assertBoundedSchema(
  schema: z.ZodType,
  typeName: string,
  subject: BoundedSchemaSubject = {}
): void {
  const ctx: Ctx = { ...ARTIFACT_SUBJECT, ...subject, typeName };

  let json: JsonSchemaNode;
  try {
    // `input` io bounds what a client may send, and is the only mode that tells a
    // stripping `z.object()` (no `additionalProperties`) apart from a closed
    // `.strict()` one (`additionalProperties: false`). Under `output` io both emit
    // `false`, so a stripping object would register while silently accepting — and
    // persisting, since the raw value is stored — undeclared fields.
    json = z.toJSONSchema(schema, { io: 'input' }) as JsonSchemaNode;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${prefix(ctx)} cannot be converted to JSON Schema: ${message}`);
  }

  const worstCaseBytes = assertBoundedNode(json, ctx.rootPath, ctx, new Set());
  if (worstCaseBytes > ctx.limits.totalBytes) {
    throw new Error(
      `${prefix(ctx)} worst-case size ${worstCaseBytes} exceeds framework cap ${
        ctx.limits.totalBytes
      }`
    );
  }
}

function assertBoundedNode(
  node: JsonSchemaNode,
  path: string,
  ctx: Ctx,
  seen: Set<JsonSchemaNode>
): number {
  if (seen.has(node)) {
    throw new Error(`${prefix(ctx)} at ${path} is recursive; recursive schemas are not supported`);
  }
  seen.add(node);

  if (typeof node.$ref === 'string') {
    throw new Error(
      `${prefix(ctx)} at ${path} uses $ref; recursive / deferred schemas are not supported`
    );
  }

  // Literal sets (z.literal / z.enum) are inherently bounded: the worst case
  // is the longest literal, serialized.
  const literals = literalValues(node);
  if (literals !== undefined) {
    if (literals.length === 0) {
      throw new Error(`${prefix(ctx)} at ${path} has an empty enum`);
    }
    return Math.max(...literals.map((value) => (JSON.stringify(value) ?? 'null').length));
  }

  // Unions (z.union, .nullable()) are bounded by their largest branch; every
  // branch must itself be bounded.
  const branches = unionBranches(node);
  if (branches !== undefined) {
    if (branches.length === 0) {
      throw new Error(`${prefix(ctx)} at ${path} has an empty union`);
    }
    return Math.max(
      ...branches.map((branch, index) => assertBoundedNode(branch, `${path}|${index}`, ctx, seen))
    );
  }

  if (node.allOf !== undefined || node.not !== undefined) {
    throw new Error(
      `${prefix(
        ctx
      )} at ${path} uses allOf/not; supported constructs are strict objects, bounded strings/arrays, numbers, booleans, enums/literals, and unions`
    );
  }

  // Zod maps z.any() / z.unknown() to unconstrained {} (no type).
  if (node.type === undefined && node.properties === undefined) {
    throw new Error(
      `${prefix(ctx)} at ${path} is unconstrained (z.any / z.unknown are not allowed)`
    );
  }

  const type = node.type;
  if (type === 'string') {
    return assertBoundedString(node, path, ctx);
  }
  if (type === 'array') {
    return assertBoundedArray(node, path, ctx, seen);
  }
  if (type === 'object') {
    return assertBoundedObject(node, path, ctx, seen);
  }
  if (type === 'number' || type === 'integer' || type === 'boolean' || type === 'null') {
    // Fixed-width JSON tokens; charge a small constant.
    return 16;
  }

  throw new Error(`${prefix(ctx)} at ${path} has unsupported JSON Schema type ${String(type)}`);
}

function literalValues(node: JsonSchemaNode): unknown[] | undefined {
  if (node.const !== undefined) {
    return [node.const];
  }
  if (Array.isArray(node.enum)) {
    return node.enum;
  }
  return undefined;
}

function unionBranches(node: JsonSchemaNode): JsonSchemaNode[] | undefined {
  const branches = node.anyOf ?? node.oneOf;
  if (branches === undefined) {
    return undefined;
  }
  if (!Array.isArray(branches)) {
    return [];
  }
  return branches as JsonSchemaNode[];
}

function assertBoundedString(node: JsonSchemaNode, path: string, ctx: Ctx): number {
  const maxLength = node.maxLength;
  if (typeof maxLength !== 'number') {
    throw new Error(`${prefix(ctx)} at ${path}: string is missing maxLength`);
  }
  if (maxLength > ctx.limits.stringLength) {
    throw new Error(
      `${prefix(ctx)} at ${path}: maxLength ${maxLength} exceeds framework cap ${
        ctx.limits.stringLength
      }`
    );
  }
  // Quote characters + content.
  return maxLength + 2;
}

function assertBoundedArray(
  node: JsonSchemaNode,
  path: string,
  ctx: Ctx,
  seen: Set<JsonSchemaNode>
): number {
  const maxItems = node.maxItems;
  if (typeof maxItems !== 'number') {
    throw new Error(`${prefix(ctx)} at ${path}: array is missing maxItems`);
  }
  if (maxItems > ctx.limits.arrayItems) {
    throw new Error(
      `${prefix(ctx)} at ${path}: maxItems ${maxItems} exceeds framework cap ${
        ctx.limits.arrayItems
      }`
    );
  }

  const items = node.items;
  if (items === undefined || typeof items !== 'object' || Array.isArray(items)) {
    throw new Error(`${prefix(ctx)} at ${path}: array items must be a single bounded schema`);
  }

  const elementBytes = assertBoundedNode(items as JsonSchemaNode, `${path}[]`, ctx, seen);
  // '[' ']' and commas between elements
  return 2 + maxItems * elementBytes + Math.max(0, maxItems - 1);
}

function assertBoundedObject(
  node: JsonSchemaNode,
  path: string,
  ctx: Ctx,
  seen: Set<JsonSchemaNode>
): number {
  if (node.additionalProperties !== false) {
    throw new Error(
      `${prefix(
        ctx
      )} at ${path}: object must be closed (use .strict(); additionalProperties must be false)`
    );
  }

  // Unbounded records use additionalProperties: <schema> rather than false.
  // The check above already rejects those.

  const properties = (node.properties ?? {}) as Record<string, JsonSchemaNode>;
  let total = 2; // `{` `}`
  let first = true;
  for (const [key, child] of Object.entries(properties)) {
    const childBytes = assertBoundedNode(child, `${path}.${key}`, ctx, seen);
    const keyBytes = key.length + 2; // quoted key
    total += (first ? 0 : 1) + keyBytes + 1 + childBytes; // comma + "key":value
    first = false;
  }
  return total;
}
