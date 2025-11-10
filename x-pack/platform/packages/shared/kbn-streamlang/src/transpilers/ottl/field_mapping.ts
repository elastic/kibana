/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeOTTLString } from './ottl_helpers';

/**
 * OTEL field prefixes based on the OTEL data model
 */
export const OTEL_PREFIXES = ['resource.attributes.', 'scope.attributes.', 'attributes.'];

/**
 * Converts an Elasticsearch field path to an OTTL getter expression
 *
 * Examples:
 * - "resource.attributes.host.name" → resource.attributes["host.name"]
 * - "attributes.log.level" → attributes["log.level"]
 * - "body.text" → body
 * - "body.structured.json.field" → body["json.field"]
 *
 * @param fieldName The Elasticsearch field name
 * @returns The OTTL getter expression
 */
export function fieldToOTTLGetter(fieldName: string): string {
  // Check for OTEL prefix
  const prefix = OTEL_PREFIXES.find((p) => fieldName.startsWith(p));
  if (prefix) {
    const rest = fieldName.slice(prefix.length);
    const prefixWithoutDot = prefix.slice(0, -1);
    return `${prefixWithoutDot}["${escapeOTTLString(rest)}"]`;
  }

  // Special case: body.text → body
  if (fieldName === 'body.text') {
    return 'body';
  }

  // Special case: body.structured.* → body["*"]
  if (fieldName.startsWith('body.structured.')) {
    const rest = fieldName.slice('body.structured.'.length);
    return `body["${escapeOTTLString(rest)}"]`;
  }

  // For backwards compatibility, treat bare field names as attributes
  if (!fieldName.includes('.')) {
    return `attributes["${escapeOTTLString(fieldName)}"]`;
  }

  // Default: assume it's an attributes field
  return `attributes["${escapeOTTLString(fieldName)}"]`;
}

/**
 * Converts an Elasticsearch field path to an OTTL setter expression
 *
 * Examples:
 * - "attributes.new_field" → attributes["new_field"]
 * - "resource.attributes.env" → resource.attributes["env"]
 *
 * @param fieldName The Elasticsearch field name
 * @returns The OTTL setter expression
 */
export function fieldToOTTLSetter(fieldName: string): string {
  // Setter is the same as getter for most cases
  return fieldToOTTLGetter(fieldName);
}

/**
 * Extracts the parent path and field name for deletion operations
 *
 * Examples:
 * - "attributes.log.level" → { parent: "attributes", field: "log.level" }
 * - "resource.attributes.host.name" → { parent: "resource.attributes", field: "host.name" }
 *
 * @param fieldName The Elasticsearch field name
 * @returns Object with parent path and field name
 */
export function getFieldParentAndName(fieldName: string): {
  parent: string;
  field: string;
} {
  // Check for OTEL prefix
  const prefix = OTEL_PREFIXES.find((p) => fieldName.startsWith(p));
  if (prefix) {
    const rest = fieldName.slice(prefix.length);
    const prefixWithoutDot = prefix.slice(0, -1);
    return {
      parent: prefixWithoutDot,
      field: rest,
    };
  }

  // Special case: body.structured.* → body
  if (fieldName.startsWith('body.structured.')) {
    const rest = fieldName.slice('body.structured.'.length);
    return {
      parent: 'body',
      field: rest,
    };
  }

  // Default: assume attributes
  return {
    parent: 'attributes',
    field: fieldName,
  };
}
