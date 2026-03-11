/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KEEP_FIELDS, NAMESPACE_PREFIXES } from '@kbn/streamlang';

// Re-export for backwards compatibility
export const keepFields: readonly string[] = KEEP_FIELDS;
export const namespacePrefixes: readonly string[] = NAMESPACE_PREFIXES;

/**
 * Field names that are reserved for OTel compatibility mode.
 * These are either passthrough objects or alias fields that cannot be used as custom field names.
 * IMPORTANT: This list must match the keys of baseMappings in logs_layer.ts.
 * A test in logs_layer.test.ts ensures these stay in sync.
 */
export const otelReservedFields = [
  'body',
  'attributes',
  'scope',
  'resource',
  'span.id',
  'message',
  'trace.id',
  'log.level',
] as const;

export const aliases: Record<string, string> = {
  trace_id: 'trace.id',
  span_id: 'span.id',
  severity_text: 'log.level',
  'body.text': 'message',
};

export function getRegularEcsField(field: string): string {
  // check whether it starts with a namespace prefix
  for (const prefix of NAMESPACE_PREFIXES) {
    if (field.startsWith(prefix)) {
      return field.slice(prefix.length);
    }
  }
  // check aliases
  if (aliases[field]) {
    return aliases[field];
  }
  return field;
}

export function isNamespacedEcsField(field: string): boolean {
  return (
    NAMESPACE_PREFIXES.some((prefix) => field.startsWith(prefix)) ||
    KEEP_FIELDS.includes(field as any)
  );
}

/**
 * Checks if a field name is reserved for OTel compatibility mode.
 * Reserved fields are either passthrough objects or alias fields that cannot be redefined.
 */
export function isOtelReservedField(field: string): boolean {
  return otelReservedFields.includes(field as (typeof otelReservedFields)[number]);
}
