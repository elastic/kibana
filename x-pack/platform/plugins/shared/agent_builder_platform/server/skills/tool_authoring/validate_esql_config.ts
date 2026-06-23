/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateQuery } from '@kbn/esql-language';
import { getESQLQueryVariables } from '@kbn/esql-utils';
import type {
  EsqlToolConfig,
  EsqlToolFieldTypes,
  EsqlToolParamValue,
} from '@kbn/agent-builder-common';

/**
 * Lightweight mirror of the ES|QL tool type's `validateConfig` in
 * `x-pack/platform/plugins/shared/agent_builder/server/services/tools/tool_types/esql/validate_configuration.ts`.
 *
 * Run by the chat-authoring inline tools so that invalid drafts fail at
 * propose / patch time instead of waiting for the user to hit Create.
 * The canonical (server) validator still runs at create time, so this is
 * defense in depth — not a replacement.
 *
 * Returns an array of human-readable error messages (empty when valid). We
 * collect rather than throw so a single bad draft can report all problems
 * to the LLM in one turn.
 */
export const validateEsqlConfigForChat = async (
  configuration: EsqlToolConfig
): Promise<string[]> => {
  const errors: string[] = [];

  const syntax = await validateQuery(configuration.query);
  if (syntax.errors.length > 0) {
    errors.push(
      `ES|QL syntax: ${syntax.errors
        .map((e) => ('text' in e ? e.text : 'message' in e ? e.message : ''))
        .filter(Boolean)
        .join('; ')}`
    );
  }

  // Even if syntax fails, still try to surface param mismatches when the
  // parser can extract them — usually it can.
  let queryParams: string[] = [];
  try {
    queryParams = getESQLQueryVariables(configuration.query);
  } catch {
    queryParams = [];
  }
  const definedParams = Object.keys(configuration.params);

  const undefinedParams = queryParams.filter((p) => !definedParams.includes(p));
  if (undefinedParams.length > 0) {
    errors.push(
      `Query references parameters that aren't defined in 'params': ${undefinedParams.join(
        ', '
      )}. ` + `Defined params: ${definedParams.join(', ') || '(none)'}.`
    );
  }

  const unusedParams = definedParams.filter((p) => !queryParams.includes(p));
  if (unusedParams.length > 0) {
    errors.push(
      `Defined parameters not referenced via '?name' in the query: ${unusedParams.join(', ')}.`
    );
  }

  for (const [name, param] of Object.entries(configuration.params)) {
    if (param.defaultValue !== undefined) {
      const typeError = checkDefaultValueType(param.type, param.defaultValue, name);
      if (typeError) errors.push(typeError);
    }
  }

  return errors;
};

const checkDefaultValueType = (
  type: EsqlToolFieldTypes,
  defaultValue: EsqlToolParamValue,
  paramName: string
): string | undefined => {
  switch (type) {
    case 'string':
    case 'date':
      if (typeof defaultValue !== 'string') {
        return `Parameter '${paramName}' has type '${type}' but defaultValue is not a string.`;
      }
      return undefined;
    case 'integer':
      if (typeof defaultValue !== 'number' || !Number.isInteger(defaultValue)) {
        return `Parameter '${paramName}' has type 'integer' but defaultValue is not an integer.`;
      }
      return undefined;
    case 'float':
      if (typeof defaultValue !== 'number') {
        return `Parameter '${paramName}' has type 'float' but defaultValue is not a number.`;
      }
      return undefined;
    case 'boolean':
      if (typeof defaultValue !== 'boolean') {
        return `Parameter '${paramName}' has type 'boolean' but defaultValue is not a boolean.`;
      }
      return undefined;
    case 'array':
      if (!Array.isArray(defaultValue)) {
        return `Parameter '${paramName}' has type 'array' but defaultValue is not an array.`;
      }
      if (!defaultValue.every((item) => typeof item === 'string' || typeof item === 'number')) {
        return `Parameter '${paramName}' has type 'array' but defaultValue contains items that aren't strings or numbers.`;
      }
      return undefined;
  }
};
