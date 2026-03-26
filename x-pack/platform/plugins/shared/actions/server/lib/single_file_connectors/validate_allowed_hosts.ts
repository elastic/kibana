/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ValidatorServices } from '../../types';

export function validateValueAgainstAllowedHostsJsonSchema(
  value: unknown,
  schemaNode: unknown,
  configurationUtilities: ValidatorServices['configurationUtilities'],
  rootJsonSchema: unknown = schemaNode
): void {
  if (value == null) {
    return;
  }
  if (!schemaNode || typeof schemaNode !== 'object') {
    return;
  }

  if (hasAllowedHostsOptOut(schemaNode)) {
    return;
  }

  const dereferencedSchemaNode = dereferenceJsonSchemaNode(schemaNode, rootJsonSchema);
  if (dereferencedSchemaNode && dereferencedSchemaNode !== schemaNode) {
    schemaNode = dereferencedSchemaNode;
    if (hasAllowedHostsOptOut(schemaNode)) {
      return;
    }
  }

  if (isUriStringJsonSchema(schemaNode)) {
    if (typeof value === 'string') {
      configurationUtilities.ensureUriAllowed(value);
    }
    return;
  }

  for (const combinatorKey of ['anyOf', 'oneOf', 'allOf'] as const) {
    const combinator = (schemaNode as Record<string, unknown>)[combinatorKey];
    if (Array.isArray(combinator)) {
      for (const child of combinator) {
        validateValueAgainstAllowedHostsJsonSchema(value, child, configurationUtilities, rootJsonSchema);
      }
    }
  }

  const properties = (schemaNode as { properties?: unknown }).properties;
  if (properties && typeof properties === 'object' && value && typeof value === 'object') {
    const recordValue = value as Record<string, unknown>;
    for (const [key, childSchema] of Object.entries(properties as Record<string, unknown>)) {
      validateValueAgainstAllowedHostsJsonSchema(
        recordValue[key],
        childSchema,
        configurationUtilities,
        rootJsonSchema
      );
    }
  }

  const items = (schemaNode as { items?: unknown }).items;
  if (items && Array.isArray(value)) {
    for (const item of value) {
      validateValueAgainstAllowedHostsJsonSchema(item, items, configurationUtilities, rootJsonSchema);
    }
  }
}

export function getDiscriminatedUnionVariantJsonSchemaNode(
  jsonSchema: unknown,
  discriminatorKey: string,
  discriminatorValue: string
): unknown | undefined {
  if (!jsonSchema || typeof jsonSchema !== 'object') {
    return undefined;
  }

  for (const unionKey of ['anyOf', 'oneOf'] as const) {
    const union = (jsonSchema as Record<string, unknown>)[unionKey];
    if (Array.isArray(union)) {
      return findVariantByConstProperty(union, discriminatorKey, discriminatorValue, jsonSchema);
    }
  }

  return undefined;
}

function findVariantByConstProperty(
  candidates: unknown[],
  discriminatorKey: string,
  discriminatorValue: string,
  rootJsonSchema: unknown
): unknown | undefined {
  for (const candidate of candidates) {
    const resolvedCandidate = dereferenceJsonSchemaNode(candidate, rootJsonSchema) ?? candidate;
    if (!resolvedCandidate || typeof resolvedCandidate !== 'object') {
      continue;
    }

    const properties = (resolvedCandidate as { properties?: unknown }).properties;
    if (!properties || typeof properties !== 'object') {
      continue;
    }

    const discriminatorSchema = (properties as Record<string, unknown>)[discriminatorKey];
    if (!discriminatorSchema || typeof discriminatorSchema !== 'object') {
      continue;
    }

    const constValue = (discriminatorSchema as { const?: unknown }).const;
    if (constValue === discriminatorValue) {
      return resolvedCandidate;
    }
  }

  return undefined;
}

function hasAllowedHostsOptOut(schemaNode: unknown): boolean {
  if (!schemaNode || typeof schemaNode !== 'object') {
    return false;
  }
  const validate = (schemaNode as { validate?: unknown }).validate;
  if (!validate || typeof validate !== 'object') {
    return false;
  }
  return (validate as { allowedHosts?: unknown }).allowedHosts === false;
}

function dereferenceJsonSchemaNode(schemaNode: unknown, rootJsonSchema: unknown): unknown | undefined {
  if (!schemaNode || typeof schemaNode !== 'object') {
    return undefined;
  }
  if (!rootJsonSchema || typeof rootJsonSchema !== 'object') {
    return undefined;
  }

  const visitedRefs = new Set<string>();
  let current: unknown = schemaNode;

  while (current && typeof current === 'object') {
    const ref = (current as { $ref?: unknown }).$ref;
    if (typeof ref !== 'string') {
      return current;
    }

    if (visitedRefs.has(ref)) {
      return current;
    }
    visitedRefs.add(ref);

    const resolved = resolveLocalJsonSchemaRef(rootJsonSchema, ref);
    if (!resolved) {
      return current;
    }

    current = resolved;
  }

  return current;
}

function resolveLocalJsonSchemaRef(rootJsonSchema: unknown, ref: string): unknown | undefined {
  if (!ref.startsWith('#')) {
    return undefined;
  }

  const fragment = ref.slice(1);
  if (fragment === '') {
    return rootJsonSchema;
  }
  if (!fragment.startsWith('/')) {
    return undefined;
  }

  const pointerSegments = fragment
    .split('/')
    .slice(1)
    .map((segment) => segment.replace(/~1/g, '/').replace(/~0/g, '~'));

  let current: unknown = rootJsonSchema;
  for (const segment of pointerSegments) {
    if (!current || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

function isUriStringJsonSchema(node: unknown): boolean {
  if (!node || typeof node !== 'object') {
    return false;
  }
  return (
    (node as { type?: unknown }).type === 'string' && (node as { format?: unknown }).format === 'uri'
  );
}

