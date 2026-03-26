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
  configurationUtilities: ValidatorServices['configurationUtilities']
): void {
  if (value == null) {
    return;
  }
  if (!schemaNode || typeof schemaNode !== 'object') {
    return;
  }

  const validate = (schemaNode as { validate?: unknown }).validate;
  if (validate && typeof validate === 'object') {
    const allowedHosts = (validate as { allowedHosts?: unknown }).allowedHosts;
    if (allowedHosts === false) {
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
        validateValueAgainstAllowedHostsJsonSchema(value, child, configurationUtilities);
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
        configurationUtilities
      );
    }
  }

  const items = (schemaNode as { items?: unknown }).items;
  if (items && Array.isArray(value)) {
    for (const item of value) {
      validateValueAgainstAllowedHostsJsonSchema(item, items, configurationUtilities);
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
      return findVariantByConstProperty(union, discriminatorKey, discriminatorValue);
    }
  }

  return undefined;
}

function findVariantByConstProperty(
  candidates: unknown[],
  discriminatorKey: string,
  discriminatorValue: string
): unknown | undefined {
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object') {
      continue;
    }

    const properties = (candidate as { properties?: unknown }).properties;
    if (!properties || typeof properties !== 'object') {
      continue;
    }

    const discriminatorSchema = (properties as Record<string, unknown>)[discriminatorKey];
    if (!discriminatorSchema || typeof discriminatorSchema !== 'object') {
      continue;
    }

    const constValue = (discriminatorSchema as { const?: unknown }).const;
    if (constValue === discriminatorValue) {
      return candidate;
    }
  }

  return undefined;
}

function isUriStringJsonSchema(node: unknown): boolean {
  if (!node || typeof node !== 'object') {
    return false;
  }
  return (
    (node as { type?: unknown }).type === 'string' && (node as { format?: unknown }).format === 'uri'
  );
}

