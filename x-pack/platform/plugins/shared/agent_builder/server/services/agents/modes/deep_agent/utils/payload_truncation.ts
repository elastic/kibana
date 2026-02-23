/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Payload truncation utilities for skill tool responses.
 *
 * These utilities help keep payloads compact to avoid context overflow while
 * preserving the most important information for LLM self-correction.
 */

/** Default maximum characters for truncated payloads */
export const DEFAULT_MAX_CHARS = 6000;

/** Maximum depth for nested object truncation */
const MAX_DEPTH = 4;

/** Maximum array items to show before truncation */
const MAX_ARRAY_ITEMS = 10;

/** Maximum properties to show in an object before truncation */
const MAX_OBJECT_PROPS = 15;

/** Maximum string length before truncation */
const MAX_STRING_LENGTH = 500;

/**
 * Truncates a string to a maximum length, adding an ellipsis if truncated.
 */
export function truncateString(str: string, maxLength: number = MAX_STRING_LENGTH): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

/**
 * Deep truncates a value, limiting depth, array lengths, object properties, and string lengths.
 * This preserves the structure of the data while reducing its size.
 */
export function deepTruncate(value: unknown, depth: number = 0): unknown {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return value;
  }

  // Handle primitives
  if (typeof value === 'string') {
    return truncateString(value);
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  // Depth limit reached
  if (depth >= MAX_DEPTH) {
    if (Array.isArray(value)) {
      return `[Array(${value.length})]`;
    }
    if (typeof value === 'object') {
      return '[Object]';
    }
    return String(value);
  }

  // Handle arrays
  if (Array.isArray(value)) {
    const truncatedItems = value.slice(0, MAX_ARRAY_ITEMS).map((item) => deepTruncate(item, depth + 1));
    if (value.length > MAX_ARRAY_ITEMS) {
      truncatedItems.push(`... (${value.length - MAX_ARRAY_ITEMS} more items)`);
    }
    return truncatedItems;
  }

  // Handle objects
  if (typeof value === 'object') {
    const entries = Object.entries(value);
    const truncatedEntries = entries.slice(0, MAX_OBJECT_PROPS);
    const result: Record<string, unknown> = {};

    for (const [key, val] of truncatedEntries) {
      result[key] = deepTruncate(val, depth + 1);
    }

    if (entries.length > MAX_OBJECT_PROPS) {
      result['...'] = `(${entries.length - MAX_OBJECT_PROPS} more properties)`;
    }

    return result;
  }

  return String(value);
}

/**
 * Truncates a JSON schema to show only essential information.
 * Preserves: type, required fields, property names with types, and descriptions (truncated).
 */
export function truncateSchema(schema: unknown, maxChars: number = 2000): unknown {
  if (!schema || typeof schema !== 'object') return schema;

  const s = schema as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  // Always preserve type
  if (s.type) result.type = s.type;

  // Preserve required fields
  if (Array.isArray(s.required) && s.required.length > 0) {
    result.required = s.required.slice(0, 10);
    if (s.required.length > 10) {
      (result.required as unknown[]).push(`... (${s.required.length - 10} more)`);
    }
  }

  // Truncate description
  if (typeof s.description === 'string') {
    result.description = truncateString(s.description, 200);
  }

  // Handle properties - show names and types
  if (s.properties && typeof s.properties === 'object') {
    const props = s.properties as Record<string, unknown>;
    const propNames = Object.keys(props);
    const truncatedProps: Record<string, unknown> = {};

    for (const name of propNames.slice(0, MAX_OBJECT_PROPS)) {
      const prop = props[name] as Record<string, unknown>;
      if (prop) {
        truncatedProps[name] = {
          type: prop.type,
          ...(prop.description ? { description: truncateString(String(prop.description), 100) } : {}),
          ...(prop.enum ? { enum: Array.isArray(prop.enum) ? prop.enum.slice(0, 5) : prop.enum } : {}),
          ...(prop.const !== undefined ? { const: prop.const } : {}),
        };
      }
    }

    if (propNames.length > MAX_OBJECT_PROPS) {
      truncatedProps['...'] = `(${propNames.length - MAX_OBJECT_PROPS} more properties)`;
    }

    result.properties = truncatedProps;
  }

  // Handle oneOf/anyOf - only show first few with operation names if present
  for (const key of ['oneOf', 'anyOf'] as const) {
    if (Array.isArray(s[key])) {
      const items = s[key] as Array<Record<string, unknown>>;
      result[key] = items.slice(0, 5).map((item) => {
        const op = (item.properties as Record<string, unknown>)?.operation as Record<string, unknown>;
        if (op?.const) {
          return { operation: op.const, '...': '(see full schema)' };
        }
        return truncateSchema(item, maxChars / 5);
      });
      if (items.length > 5) {
        (result[key] as unknown[]).push({ '...': `(${items.length - 5} more variants)` });
      }
    }
  }

  return result;
}

/**
 * Generates a minimal example based on a JSON schema.
 * Useful for providing expected_params_example in error responses.
 */
export function generateMinimalExample(schema: unknown): Record<string, unknown> | undefined {
  if (!schema || typeof schema !== 'object') return undefined;

  const s = schema as Record<string, unknown>;
  const example: Record<string, unknown> = {};

  // Handle oneOf/anyOf - pick first variant
  const variants = (s.oneOf ?? s.anyOf) as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(variants) && variants.length > 0) {
    return generateMinimalExample(variants[0]);
  }

  // Generate example from properties
  if (s.properties && typeof s.properties === 'object') {
    const props = s.properties as Record<string, Record<string, unknown>>;
    const required = Array.isArray(s.required) ? (s.required as string[]) : [];

    // Only include required properties in the example
    for (const name of required.slice(0, 5)) {
      const prop = props[name];
      if (prop) {
        example[name] = getExampleValue(prop);
      }
    }

    // If no required, show first 3 properties
    if (required.length === 0) {
      const propNames = Object.keys(props).slice(0, 3);
      for (const name of propNames) {
        example[name] = getExampleValue(props[name]);
      }
    }
  }

  return Object.keys(example).length > 0 ? example : undefined;
}

/**
 * Gets an example value for a schema property.
 */
function getExampleValue(prop: Record<string, unknown>): unknown {
  // Use const if available
  if (prop.const !== undefined) return prop.const;

  // Use first enum value
  if (Array.isArray(prop.enum) && prop.enum.length > 0) {
    return prop.enum[0];
  }

  // Use default if available
  if (prop.default !== undefined) return prop.default;

  // Generate based on type
  switch (prop.type) {
    case 'string':
      return '<string>';
    case 'number':
    case 'integer':
      return 0;
    case 'boolean':
      return true;
    case 'array':
      return [];
    case 'object':
      return {};
    default:
      return '<value>';
  }
}

/**
 * Converts a value to compact JSON with intelligent truncation.
 * This is the main function to use for payload truncation.
 */
export function toCompactJson(value: unknown, maxChars: number = DEFAULT_MAX_CHARS): string {
  try {
    // First try full serialization
    const full = JSON.stringify(value, null, 2);
    if (full.length <= maxChars) return full;

    // Apply deep truncation and try again
    const truncated = deepTruncate(value);
    const truncatedStr = JSON.stringify(truncated, null, 2);
    if (truncatedStr.length <= maxChars) return truncatedStr;

    // Final fallback: hard character limit
    return truncatedStr.slice(0, maxChars) + `\n... (truncated, ${truncatedStr.length - maxChars} chars omitted)`;
  } catch (_e) {
    return String(value);
  }
}

/**
 * Creates a truncated error payload with schema and example.
 * Follows AGENTS.md guidelines for error handling.
 */
export function createTruncatedErrorPayload(options: {
  message: string;
  toolName: string;
  skillNamespace?: string;
  operation?: string;
  schema?: unknown;
  receivedParams?: unknown;
  hint?: string;
}): string {
  const { message, toolName, skillNamespace, operation, schema, receivedParams, hint } = options;

  const payload: Record<string, unknown> = {
    error: {
      message: truncateString(message, 500),
      tool: toolName,
      ...(skillNamespace ? { skill: skillNamespace } : {}),
    },
  };

  if (operation) {
    payload.operation = operation;
  }

  // Add truncated schema if provided
  if (schema) {
    payload.expected_schema = truncateSchema(schema);

    // Generate minimal example for self-correction
    const example = generateMinimalExample(schema);
    if (example) {
      payload.expected_params_example = example;
    }
  }

  // Add hint for correction
  payload.hint = hint || 'Fix the tool call arguments to match expected_schema and retry invoke_skill.';

  // If received params were very wrong, show a truncated version
  if (receivedParams && typeof receivedParams === 'object') {
    const receivedKeys = Object.keys(receivedParams);
    if (receivedKeys.length > 0) {
      payload.received_keys = receivedKeys.slice(0, 10);
      if (receivedKeys.length > 10) {
        payload.received_keys_total = receivedKeys.length;
      }
    }
  }

  return toCompactJson(payload);
}

/**
 * Truncates tool result content if it exceeds the limit.
 * Preserves structure for arrays and objects.
 */
export function truncateToolResult(result: unknown, maxChars: number = DEFAULT_MAX_CHARS): string {
  if (typeof result === 'string') {
    if (result.length <= maxChars) return result;
    return result.slice(0, maxChars) + '\n... [results truncated, try being more specific with your parameters]';
  }

  return toCompactJson(result, maxChars);
}
