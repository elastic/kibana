/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERTING_V2_NOTIFICATION_GROUP_INPUT_DEFINITION_ID,
  builtinWorkflowInputDefinitions,
  scanForTemplateVariables,
  type JsonSchema,
} from '@kbn/workflows';
import { parse as parseYaml } from 'yaml';

const PAYLOAD_PREFIX = 'inputs.payload';

const getPayloadSchema = (): JsonSchema => {
  const schema =
    builtinWorkflowInputDefinitions[ALERTING_V2_NOTIFICATION_GROUP_INPUT_DEFINITION_ID];
  if (!schema) {
    throw new Error(
      `Missing built-in workflow input definition "${ALERTING_V2_NOTIFICATION_GROUP_INPUT_DEFINITION_ID}"`
    );
  }
  return schema;
};

const isUnderPrefix = (path: string, prefix: string): boolean =>
  path === prefix || path.startsWith(`${prefix}.`) || path.startsWith(`${prefix}[`);

/**
 * Returns true when `path` references the action-policy dispatch payload
 * (`ActionPolicyWorkflowPayload` via `inputs.payload.*`).
 */
export const isActionPolicyPayloadLiquidPath = (path: string): boolean =>
  isUnderPrefix(path, PAYLOAD_PREFIX);

/**
 * Split a Liquid path into segments, treating `[...]` as its own segment.
 * e.g. `rules[ep.rule_id].name` → `['rules', '[ep.rule_id]', 'name']`
 */
const splitPathSegments = (path: string): string[] => {
  const segments: string[] = [];
  let current = '';

  for (let i = 0; i < path.length; i += 1) {
    const char = path[i];
    if (char === '.' && !current.startsWith('[')) {
      if (current) segments.push(current);
      current = '';
      continue;
    }
    if (char === '[') {
      if (current) {
        segments.push(current);
        current = '';
      }
      const close = path.indexOf(']', i);
      if (close === -1) {
        segments.push(path.slice(i));
        return segments;
      }
      segments.push(path.slice(i, close + 1));
      i = close;
      continue;
    }
    current += char;
  }

  if (current) segments.push(current);
  return segments;
};

const isBracketSegment = (segment: string): boolean =>
  segment.startsWith('[') && segment.endsWith(']');

const resolveArrayItemSchema = (
  items: JsonSchema | JsonSchema[] | undefined
): JsonSchema | undefined => {
  if (!items) return undefined;
  // Tuple schemas use JsonSchema[]; Liquid index access can't pick a
  // specific slot, so walk the first item schema.
  return Array.isArray(items) ? items[0] : items;
};

/**
 * Walk `relativePath` (everything after `inputs.payload`) against the
 * alertingV2NotificationGroup JSON Schema. Returns null when valid, or the
 * first invalid segment.
 */
export const getInvalidActionPolicyPayloadField = (
  relativePath: string,
  schema: JsonSchema = getPayloadSchema()
): string | null => {
  if (!relativePath) return null;

  let current: JsonSchema | undefined = schema;
  for (const segment of splitPathSegments(relativePath)) {
    if (!current) {
      return relativePath;
    }

    if (isBracketSegment(segment)) {
      if (current.type === 'array') {
        current = resolveArrayItemSchema(current.items);
        continue;
      }
      // Object key access like rules[ep.rule_id]
      if (current.type === 'object' && current.additionalProperties) {
        current = { type: 'object', additionalProperties: true };
        continue;
      }
      return relativePath;
    }

    if (current.type !== 'object') {
      return relativePath;
    }

    const next: JsonSchema | undefined = current.properties?.[segment];
    if (next) {
      current = next;
      continue;
    }

    if (current.additionalProperties) {
      current = { type: 'object', additionalProperties: true };
      continue;
    }

    return segment;
  }

  return null;
};

export interface AssertActionPolicyWorkflowLiquidResult {
  /** Unique Liquid variable paths extracted from the workflow YAML. */
  variables: string[];
}

/**
 * Asserts that an action-policy notification workflow:
 * 1. Parses as valid YAML
 * 2. Contains valid Liquid (via `@kbn/workflows` `scanForTemplateVariables`)
 * 3. References `inputs.payload.*` at least once
 * 4. Those `inputs.payload.*` paths use fields from the
 *    `alertingV2NotificationGroup` payload schema
 */
export const assertActionPolicyWorkflowLiquid = (
  yaml: string
): AssertActionPolicyWorkflowLiquidResult => {
  let parsed: unknown;
  try {
    parsed = parseYaml(yaml);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Generated workflow YAML is not valid YAML: ${message}`);
  }

  let variables: string[];
  try {
    variables = Array.from(new Set(scanForTemplateVariables(parsed))).sort();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Generated workflow contains invalid Liquid template syntax: ${message}`);
  }

  const payloadVariables = variables.filter(isActionPolicyPayloadLiquidPath);
  if (payloadVariables.length === 0) {
    throw new Error(
      `Generated workflow Liquid does not reference \`inputs.payload.*\`. ` +
        `Action-policy dispatch exposes alert data as \`inputs.payload\` ` +
        `(mirrors \`ActionPolicyWorkflowPayload\`). ` +
        `Found variables: ${
          variables.length > 0 ? variables.map((path) => `\`${path}\``).join(', ') : '(none)'
        }.`
    );
  }

  const payloadSchema = getPayloadSchema();
  const invalidPayloadPaths = payloadVariables.filter((path) => {
    const relative =
      path === PAYLOAD_PREFIX
        ? ''
        : path.startsWith(`${PAYLOAD_PREFIX}.`)
        ? path.slice(PAYLOAD_PREFIX.length + 1)
        : path.slice(PAYLOAD_PREFIX.length); // inputs.payload[...]
    return getInvalidActionPolicyPayloadField(relative, payloadSchema) !== null;
  });

  if (invalidPayloadPaths.length > 0) {
    const allowedTopLevel = Object.keys(payloadSchema.properties ?? {}).join(', ');
    throw new Error(
      `Generated workflow Liquid references unknown \`inputs.payload\` fields: ` +
        `${invalidPayloadPaths.map((path) => `\`${path}\``).join(', ')}. ` +
        `Allowed top-level payload fields: ${allowedTopLevel}.`
    );
  }

  return { variables };
};
