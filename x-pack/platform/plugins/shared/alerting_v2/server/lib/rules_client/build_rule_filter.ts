/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { KueryNode } from '@kbn/es-query';
import { fromKueryExpression, toKqlExpression } from '@kbn/es-query';

import { RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';
import { ALERTING_ERROR_CODES } from '../errors/error_codes';

/**
 * Mapping from clean API-facing field names to their saved-object KQL paths.
 *
 * Clients send filters using these clean names (e.g. `kind: signal`).
 * This mapping lets us translate them into the saved-object-specific
 * KQL format (e.g. `alerting_rule.attributes.kind: signal`) that the
 * saved objects client expects.
 *
 * `id` is special — it lives on the root saved object, not under `.attributes`.
 *
 * `metadata.builder_fields.*` paths are handled separately via a prefix rule
 * below: any field of the form `metadata.builder_fields.<sub-field>` (where
 * `<sub-field>` is at least one character) is accepted and mapped to the
 * corresponding SO attribute path. The `flattened` mapping type supports
 * keyword queries on any sub-path, including paths without explicit typed
 * sub-field declarations, so this does not risk throwing a mapping error.
 * The trade-off is that a misspelled sub-field path silently returns 0 results,
 * the same behaviour as filtering any keyword field for a non-existent value.
 *
 * Ref: rule-identity.md "Storage and migration" (signature_id)
 *      rule-source.md "Storage and migration" (source.*)
 *      rule-ownership.md "Storage, mapping, and migration" (ownership.*)
 *      rule-types.md "The discriminator must be indexed and filterable" (builder_type)
 */
const FIELD_MAP: Record<string, string> = {
  id: `${RULE_SAVED_OBJECT_TYPE}.id`,
  kind: `${RULE_SAVED_OBJECT_TYPE}.attributes.kind`,
  enabled: `${RULE_SAVED_OBJECT_TYPE}.attributes.enabled`,
  'metadata.name': `${RULE_SAVED_OBJECT_TYPE}.attributes.metadata.name`,
  'metadata.description': `${RULE_SAVED_OBJECT_TYPE}.attributes.metadata.description`,
  'metadata.tags': `${RULE_SAVED_OBJECT_TYPE}.attributes.metadata.tags`,
  // Phase 4 fields — all indexed in model version '9'.
  'metadata.signature_id': `${RULE_SAVED_OBJECT_TYPE}.attributes.metadata.signature_id`,
  'metadata.source.type': `${RULE_SAVED_OBJECT_TYPE}.attributes.metadata.source.type`,
  'metadata.source.id': `${RULE_SAVED_OBJECT_TYPE}.attributes.metadata.source.id`,
  'metadata.source.version': `${RULE_SAVED_OBJECT_TYPE}.attributes.metadata.source.version`,
  'metadata.ownership.managed': `${RULE_SAVED_OBJECT_TYPE}.attributes.metadata.ownership.managed`,
  'metadata.ownership.solution': `${RULE_SAVED_OBJECT_TYPE}.attributes.metadata.ownership.solution`,
  'metadata.ownership.domain': `${RULE_SAVED_OBJECT_TYPE}.attributes.metadata.ownership.domain`,
  'metadata.builder_type': `${RULE_SAVED_OBJECT_TYPE}.attributes.metadata.builder_type`,
};

/**
 * Prefix for filter fields that live inside the `metadata.builder_fields`
 * flattened container. Any field of the form `metadata.builder_fields.<sub>`
 * (where `<sub>` is non-empty) is accepted via the prefix rule in
 * {@link rewriteFieldArg} and mapped to the corresponding SO attribute path.
 */
const BUILDER_FIELDS_FILTER_PREFIX = 'metadata.builder_fields.';

export const ALLOWED_FILTER_FIELDS = Object.keys(FIELD_MAP);

const toSavedObjectIdFilterValue = (ruleId: string): string => {
  const prefix = `${RULE_SAVED_OBJECT_TYPE}:`;
  if (ruleId === '*' || ruleId.includes('*')) {
    return ruleId;
  }
  return ruleId.startsWith(prefix) ? ruleId : `${prefix}${ruleId}`;
};

/**
 * Validates the field argument of a field-referencing KQL function and
 * rewrites it from the clean API name to the saved-object path.
 *
 * Special case: fields starting with `metadata.builder_fields.` followed by
 * at least one character are accepted via a prefix rule and mapped to the
 * corresponding SO attribute path. See FIELD_MAP for the full rationale.
 */
const rewriteFieldArg = (node: KueryNode): KueryNode => {
  const fieldArg = node.arguments[0];
  if (fieldArg?.type === 'literal' && typeof fieldArg.value === 'string') {
    const apiFieldName = fieldArg.value;

    // Prefix rule: metadata.builder_fields.<sub-field> maps to the SO path.
    // The sub-field must be non-empty (length > prefix length) to prevent
    // filtering on the container itself, which would silently return nothing.
    if (
      apiFieldName.startsWith(BUILDER_FIELDS_FILTER_PREFIX) &&
      apiFieldName.length > BUILDER_FIELDS_FILTER_PREFIX.length
    ) {
      const soField = `${RULE_SAVED_OBJECT_TYPE}.attributes.${apiFieldName}`;
      return {
        ...node,
        arguments: [{ ...fieldArg, value: soField }, ...node.arguments.slice(1)],
      };
    }

    const soField = FIELD_MAP[apiFieldName];
    if (!soField) {
      throw Boom.badRequest(
        `Invalid filter field "${apiFieldName}". Allowed fields: ${ALLOWED_FILTER_FIELDS.join(
          ', '
        )}; or any metadata.builder_fields.<sub-field> path`,
        {
          code: ALERTING_ERROR_CODES.INVALID_FILTER_FIELD,
          details: { field: apiFieldName, allowed_fields: ALLOWED_FILTER_FIELDS },
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
        rewrittenArgs[1] = {
          ...valueArg,
          value: toSavedObjectIdFilterValue(valueArg.value),
        };
      }
    }

    return {
      ...node,
      arguments: rewrittenArgs,
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
 * @throws Boom badRequest (400) if a field name is not in the FIELD_MAP.
 * @throws Boom badRequest (400) if an unknown KQL function type is encountered.
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
      throw Boom.badRequest(`Unsupported KQL function "${node.function}" in filter`, {
        code: ALERTING_ERROR_CODES.UNSUPPORTED_FILTER_FUNCTION,
        details: { function: node.function },
      });
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
 * // → 'NOT (alerting_rule.id: "alerting_rule:abc" OR alerting_rule.id: "alerting_rule:def")'
 *
 * @example
 * buildRuleSoFilter('enabled: true AND kind: alert')
 * // → '(alerting_rule.attributes.enabled: true AND alerting_rule.attributes.kind: alert)'
 *
 * Returns an empty string unchanged (used for "match all").
 *
 * @throws Boom badRequest (400) if the filter contains a field name not in
 *   the allowed set or uses an unsupported KQL function.
 */
export const buildRuleSoFilter = (apiFilter: string): string => {
  if (!apiFilter) {
    return apiFilter;
  }

  const ast = fromKueryExpression(apiFilter);
  const rewrittenAst = rewriteNode(ast);
  return toKqlExpression(rewrittenAst);
};
