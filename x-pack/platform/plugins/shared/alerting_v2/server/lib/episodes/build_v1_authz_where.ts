/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeStringValue } from '@kbn/esql-utils/src/utils/append_to_query/utils';

/**
 * Minimal shape of alerting's `AuthorizedRuleTypes` map used to build ES|QL
 * authorization predicates for classic (v1) alert rows.
 */
export type AuthorizedRuleTypesLike = ReadonlyMap<
  string,
  { authorizedConsumers: Record<string, unknown> }
>;

const RULE_TYPE_ID_FIELD = '`kibana.alert.rule.rule_type_id`';
const CONSUMER_FIELD = '`kibana.alert.rule.consumer`';

/**
 * True when the caller has at least one classic (v1) rule type with a non-empty
 * consumer set. Used to decide whether `$.alerts-v1` should be included in FROM
 * (avoid resolving classic indices when no classic rows can pass RBAC).
 */
export const hasAuthorizedClassicAlertTypes = (
  authorizedRuleTypes?: AuthorizedRuleTypesLike | null
): authorizedRuleTypes is AuthorizedRuleTypesLike => {
  if (!authorizedRuleTypes?.size) {
    return false;
  }

  for (const { authorizedConsumers } of authorizedRuleTypes.values()) {
    if (Object.keys(authorizedConsumers ?? {}).length > 0) {
      return true;
    }
  }

  return false;
};

/**
 * Builds an ES|QL boolean expression that:
 * - always allows rows without a classic rule type id (v2 episode rows), and
 * - allows classic rows matching the caller's authorized (ruleTypeId, consumers).
 *
 * When `authorizedRuleTypes` is empty/undefined, only v2 rows pass
 * (`rule_type_id IS NULL`). Prefer omitting `$.alerts-v1` from FROM via
 * {@link hasAuthorizedClassicAlertTypes} in that case.
 */
export const buildV1AuthzWhereExpression = (
  authorizedRuleTypes?: AuthorizedRuleTypesLike | null
): string => {
  if (!hasAuthorizedClassicAlertTypes(authorizedRuleTypes)) {
    return `${RULE_TYPE_ID_FIELD} IS NULL`;
  }

  const ruleTypeClauses: string[] = [];

  for (const [ruleTypeId, { authorizedConsumers }] of authorizedRuleTypes.entries()) {
    const consumers = Object.keys(authorizedConsumers ?? {});
    if (!consumers.length) {
      continue;
    }

    const ruleTypePredicate = `${RULE_TYPE_ID_FIELD} == ${escapeStringValue(ruleTypeId)}`;
    const consumerPredicate =
      consumers.length === 1
        ? `${CONSUMER_FIELD} == ${escapeStringValue(consumers[0])}`
        : `${CONSUMER_FIELD} IN (${consumers.map((c) => escapeStringValue(c)).join(', ')})`;

    ruleTypeClauses.push(`(${ruleTypePredicate} AND ${consumerPredicate})`);
  }

  if (!ruleTypeClauses.length) {
    return `${RULE_TYPE_ID_FIELD} IS NULL`;
  }

  return `(${RULE_TYPE_ID_FIELD} IS NULL OR (${ruleTypeClauses.join(' OR ')}))`;
};
