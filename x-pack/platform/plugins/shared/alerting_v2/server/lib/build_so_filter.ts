/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { KueryNode } from '@kbn/es-query';
import { fromKueryExpression, toKqlExpression } from '@kbn/es-query';

import { ALERTING_ERROR_CODES } from './errors/error_codes';

/**
 * Configuration for translating a clean API filter into a saved-object KQL filter.
 */
export interface SoFilterBuilderConfig {
  savedObjectType: string;
  /**
   * Mapping from clean API-facing field names (e.g. `enabled`) to their
   * saved-object KQL paths (e.g. `alerting_rule.attributes.enabled`).
   * An `id` entry is special: its values are prefixed with the saved-object type.
   */
  fieldMap: Readonly<Record<string, string>>;
}

/**
 * Creates a function that translates a clean API filter string into a
 * saved-object KQL filter by parsing it into an AST, validating and rewriting
 * field names according to `fieldMap`, and serializing back to a KQL string.
 *
 * The returned function returns an empty string unchanged (used for "match all")
 * and throws Boom badRequest (400) if the filter references a field outside
 * `fieldMap` or uses an unsupported KQL function.
 */
export const createSoFilterBuilder = ({
  savedObjectType,
  fieldMap,
}: SoFilterBuilderConfig): ((apiFilter: string) => string) => {
  const allowedFields = Object.keys(fieldMap);
  const idPrefix = `${savedObjectType}:`;

  const toSavedObjectIdFilterValue = (id: string): string => {
    if (id.includes('*')) {
      return id;
    }
    return id.startsWith(idPrefix) ? id : `${idPrefix}${id}`;
  };

  const rewriteFieldArg = (node: KueryNode): KueryNode => {
    const fieldArg = node.arguments[0];
    if (fieldArg?.type !== 'literal' || typeof fieldArg.value !== 'string') {
      return node;
    }

    const apiFieldName = fieldArg.value;
    const soField = fieldMap[apiFieldName];
    if (!soField) {
      throw Boom.badRequest(
        `Invalid filter field "${apiFieldName}". Allowed fields: ${allowedFields.join(', ')}`,
        {
          code: ALERTING_ERROR_CODES.INVALID_FILTER_FIELD,
          details: { field: apiFieldName, allowed_fields: allowedFields },
        }
      );
    }

    const rewrittenArgs: KueryNode[] = [
      { ...fieldArg, value: soField },
      ...node.arguments.slice(1),
    ];

    if (apiFieldName === 'id' && node.function === 'is') {
      const valueArg = rewrittenArgs[1];
      if (valueArg?.type === 'literal' && typeof valueArg.value === 'string') {
        rewrittenArgs[1] = { ...valueArg, value: toSavedObjectIdFilterValue(valueArg.value) };
      }
    }

    return { ...node, arguments: rewrittenArgs };
  };

  // Exhaustive over KQL function types (mirroring `getKqlFieldNames` in `@kbn/es-query`)
  // so a new function type fails loudly instead of passing unvalidated fields through.
  const rewriteNode = (node: KueryNode): KueryNode => {
    if (node.type !== 'function') {
      return node;
    }

    switch (node.function) {
      case 'and':
      case 'or':
        return { ...node, arguments: node.arguments.map(rewriteNode) };

      case 'not':
        return { ...node, arguments: [rewriteNode(node.arguments[0])] };

      // The first argument is the nested path, not a filterable field.
      case 'nested':
        return { ...node, arguments: [node.arguments[0], rewriteNode(node.arguments[1])] };

      case 'is':
      case 'range':
      case 'exists':
        return rewriteFieldArg(node);

      default:
        throw Boom.badRequest(`Unsupported KQL function "${node.function}" in filter`, {
          code: ALERTING_ERROR_CODES.UNSUPPORTED_FILTER_FUNCTION,
          details: { function: node.function },
        });
    }
  };

  return (apiFilter: string): string => {
    if (!apiFilter) {
      return apiFilter;
    }

    return toKqlExpression(rewriteNode(fromKueryExpression(apiFilter)));
  };
};
