/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KueryNode } from '@kbn/es-query';
import { fromKueryExpression, toKqlExpression } from '@kbn/es-query';

import { RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';

/**
 * Mapping from clean API-facing field names to their saved-object KQL paths.
 *
 * Clients send filters using these clean names (e.g. `kind: signal`).
 * This mapping lets us translate them into the saved-object-specific
 * KQL format (e.g. `alerting_rule.attributes.kind: signal`) that the
 * saved objects client expects.
 *
 * `id` is special — it lives on the root saved object, not under `.attributes`.
 */
const FIELD_MAP: Record<string, string> = {
  id: `${RULE_SAVED_OBJECT_TYPE}.id`,
  kind: `${RULE_SAVED_OBJECT_TYPE}.attributes.kind`,
  enabled: `${RULE_SAVED_OBJECT_TYPE}.attributes.enabled`,
  'metadata.name': `${RULE_SAVED_OBJECT_TYPE}.attributes.metadata.name`,
  'metadata.owner': `${RULE_SAVED_OBJECT_TYPE}.attributes.metadata.owner`,
  'metadata.tags': `${RULE_SAVED_OBJECT_TYPE}.attributes.metadata.tags`,
};

export const ALLOWED_FILTER_FIELDS = Object.keys(FIELD_MAP);

/**
 * Validates the field argument of a field-referencing KQL function and
 * rewrites it from the clean API name to the saved-object path.
 */
const rewriteFieldArg = (node: KueryNode): KueryNode => {
  const fieldArg = node.arguments[0];
  if (fieldArg?.type === 'literal' && typeof fieldArg.value === 'string') {
    const soField = FIELD_MAP[fieldArg.value];
    if (!soField) {
      throw new Error(
        `Invalid filter field "${fieldArg.value}". Allowed fields: ${ALLOWED_FILTER_FIELDS.join(
          ', '
        )}`
      );
    }
    return {
      ...node,
      arguments: [{ ...fieldArg, value: soField }, ...node.arguments.slice(1)],
    };
  }
  return node;
};

/**
 * Recursively walks a KueryNode AST, rewriting API field names to their
 * saved-object paths and validating that only allowed fields are used.
 *
 * Uses an exhaustive switch over all KQL function types (mirroring the
 * pattern in `@kbn/es-query`'s own `getKqlFieldNames`). If a new function
 * type is added to KQL, this will throw immediately rather than silently
 * passing unvalidated fields through.
 *
 * @throws Error if a field name is not in the FIELD_MAP.
 * @throws Error if an unknown KQL function type is encountered.
 */
const rewriteNode = (node: KueryNode): KueryNode => {
  if (node.type !== 'function') {
    return node;
  }

  switch (node.function) {
    // Compound: recurse into all child expressions
    case 'and':
    case 'or':
      return { ...node, arguments: node.arguments.map(rewriteNode) };

    // Negation: single child expression
    case 'not':
      return { ...node, arguments: [rewriteNode(node.arguments[0])] };

    // Nested: first arg is the nested path (not a filterable field),
    // second arg is the sub-expression to recurse into
    case 'nested':
      return { ...node, arguments: [node.arguments[0], rewriteNode(node.arguments[1])] };

    // Field-referencing: first arg is the field name — validate and rewrite
    case 'is':
    case 'range':
    case 'exists':
      return rewriteFieldArg(node);

    default:
      throw new Error(`Unsupported KQL function "${node.function}" in filter`);
  }
};

/**
 * Translates a clean API filter string into a saved-object KQL filter
 * by parsing the filter into an AST, walking it to validate and rewrite
 * field names, and serializing back to a KQL string.
 *
 * @example
 * buildRuleSoFilter('kind: signal')
 * // → 'alerting_rule.attributes.kind: signal'
 *
 * @example
 * buildRuleSoFilter('NOT (id: "abc" or id: "def")')
 * // → 'NOT (alerting_rule.id: "abc" OR alerting_rule.id: "def")'
 *
 * @example
 * buildRuleSoFilter('enabled: true AND kind: alert')
 * // → '(alerting_rule.attributes.enabled: true AND alerting_rule.attributes.kind: alert)'
 *
 * Returns an empty string unchanged (used for "match all").
 *
 * @throws Error if the filter contains a field name not in the allowed set.
 */
export const buildRuleSoFilter = (apiFilter: string): string => {
  if (!apiFilter) {
    return apiFilter;
  }

  const ast = fromKueryExpression(apiFilter);
  const rewrittenAst = rewriteNode(ast);
  return toKqlExpression(rewrittenAst);
};
