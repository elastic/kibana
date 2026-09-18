/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeclarativeConnectorSpec } from './types';

export interface CompatibilityResult {
  compatible: boolean;
  reasons: string[];
}

type JsonSchemaObject = Record<string, unknown> & {
  type?: unknown;
  required?: unknown;
  properties?: Record<string, unknown>;
};

const asObjectSchema = (value: unknown): JsonSchemaObject =>
  typeof value === 'object' && value !== null ? (value as JsonSchemaObject) : {};

const typeOf = (property: unknown): string => {
  const { type } = asObjectSchema(property);
  if (Array.isArray(type)) {
    return [...type].map(String).sort().join('|');
  }
  return type === undefined ? 'unknown' : String(type);
};

const hasDefault = (property: unknown): boolean => asObjectSchema(property).default !== undefined;

const requiredKeys = (schema: JsonSchemaObject): Set<string> =>
  new Set(Array.isArray(schema.required) ? schema.required.map(String) : []);

/**
 * Checks that every payload accepted by `previous` is still accepted by `next`: every previous
 * property keeps its type, and every newly required property carries a default.
 */
const compareObjectSchemas = (
  previousValue: unknown,
  nextValue: unknown,
  path: string,
  reasons: string[]
): void => {
  const previous = asObjectSchema(previousValue);
  const next = asObjectSchema(nextValue);
  const previousProperties = previous.properties ?? {};
  const nextProperties = next.properties ?? {};

  for (const [key, previousProperty] of Object.entries(previousProperties)) {
    const nextProperty = nextProperties[key];
    if (nextProperty === undefined) {
      reasons.push(`${path}.${key} was removed`);
      continue;
    }
    const previousType = typeOf(previousProperty);
    const nextType = typeOf(nextProperty);
    if (previousType !== nextType) {
      reasons.push(`${path}.${key} changed type from ${previousType} to ${nextType}`);
      continue;
    }
    if (previousType === 'object') {
      compareObjectSchemas(previousProperty, nextProperty, `${path}.${key}`, reasons);
    }
  }

  const previousRequired = requiredKeys(previous);
  for (const key of requiredKeys(next)) {
    if (!previousRequired.has(key) && !hasDefault(nextProperties[key])) {
      reasons.push(`${path}.${key} became required without a default`);
    }
  }
};

const authTypeId = (authType: string | { type: string }): string =>
  typeof authType === 'string' ? authType : authType.type;

/**
 * Additive-only rule between two versions of one connector id. Every config, secrets and
 * action-input payload the previous version accepted must still be accepted by the next one.
 */
export const checkAdditiveCompatibility = (
  previous: DeclarativeConnectorSpec,
  next: DeclarativeConnectorSpec
): CompatibilityResult => {
  const reasons: string[] = [];

  compareObjectSchemas(previous.config, next.config, 'config', reasons);

  const nextAuthTypes = new Set(next.auth.types.map(authTypeId));
  for (const authType of previous.auth.types.map(authTypeId)) {
    if (!nextAuthTypes.has(authType)) {
      reasons.push(`auth type ${authType} was removed`);
    }
  }

  for (const [actionId, previousAction] of Object.entries(previous.actions)) {
    const nextAction = next.actions[actionId];
    if (!nextAction) {
      reasons.push(`action ${actionId} was removed`);
      continue;
    }
    compareObjectSchemas(
      previousAction.input,
      nextAction.input,
      `actions.${actionId}.input`,
      reasons
    );
  }

  return { compatible: reasons.length === 0, reasons };
};
