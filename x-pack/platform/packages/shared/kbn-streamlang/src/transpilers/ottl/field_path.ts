/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Schema context determines how StreamLang field paths map to OTTL accessors.
 *
 * - 'otel-native': fields map to `attributes["field"]` (OTel SDK data)
 * - 'bodymap': fields map to `body["field"]` (ECS/Beats data encapsulated in log body)
 */
export type SchemaContext = 'otel-native' | 'bodymap';

/**
 * Convert a StreamLang dotted field path to an OTTL accessor string
 * based on the schema context.
 *
 * Examples (otel-native):
 *   "source.ip" → 'attributes["source.ip"]'
 *   "resource.host.name" → 'resource.attributes["host.name"]'
 *
 * Examples (bodymap):
 *   "source.ip" → 'body["source"]["ip"]'
 *   "message" → 'body["message"]'
 */
export function fieldToOttl(field: string, schemaContext: SchemaContext): string {
  if (schemaContext === 'bodymap') {
    return fieldToBodymap(field);
  }
  return fieldToOtelNative(field);
}

function fieldToOtelNative(field: string): string {
  // resource.* fields map to resource.attributes
  if (field.startsWith('resource.')) {
    const attrName = field.slice('resource.'.length);
    return `resource.attributes["${attrName}"]`;
  }
  // Everything else goes to attributes
  return `attributes["${field}"]`;
}

function fieldToBodymap(field: string): string {
  // In bodymap mode, dotted paths become nested body access
  const parts = field.split('.');
  return 'body' + parts.map((p) => `["${p}"]`).join('');
}

/**
 * Convert a StreamLang field path to an OTTL accessor for use as a value reference
 * (same as fieldToOttl but useful for documentation clarity).
 */
export function fieldToOttlValue(field: string, schemaContext: SchemaContext): string {
  return fieldToOttl(field, schemaContext);
}
