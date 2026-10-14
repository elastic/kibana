/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { nodeBuilder, nodeTypes, toKqlExpression } from '@kbn/es-query';

import { RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';
import { createSoFilterBuilder } from '../build_so_filter';

/**
 * Translates a clean API rule filter string into a saved-object KQL filter.
 *
 * @example
 * buildRuleSoFilter('kind: signal')
 * // → 'alerting_rule.attributes.kind: signal'
 *
 * @example
 * buildRuleSoFilter('NOT (id: "abc" or id: "def")')
 * // → 'NOT (alerting_rule.id: "alerting_rule:abc" OR alerting_rule.id: "alerting_rule:def")'
 *
 * @throws Boom badRequest (400) if the filter contains a field name not in
 *   the allowed set or uses an unsupported KQL function.
 */
export const buildRuleSoFilter = createSoFilterBuilder({
  savedObjectType: RULE_SAVED_OBJECT_TYPE,
  fieldMap: {
    id: `${RULE_SAVED_OBJECT_TYPE}.id`,
    kind: `${RULE_SAVED_OBJECT_TYPE}.attributes.kind`,
    enabled: `${RULE_SAVED_OBJECT_TYPE}.attributes.enabled`,
    'metadata.name': `${RULE_SAVED_OBJECT_TYPE}.attributes.metadata.name`,
    'metadata.description': `${RULE_SAVED_OBJECT_TYPE}.attributes.metadata.description`,
    'metadata.tags': `${RULE_SAVED_OBJECT_TYPE}.attributes.metadata.tags`,
    'metadata.routing_tags': `${RULE_SAVED_OBJECT_TYPE}.attributes.metadata.routing_tags`,
  },
});

/**
 * Builds the API filter for the alert rules with at least one of the given routing
 * tags, or for every alert rule when no tags are given.
 */
export const buildMatchingRulesFilter = (tags: string[]): string => {
  const alertRules = nodeBuilder.is('kind', 'alert');
  if (tags.length === 0) {
    return toKqlExpression(alertRules);
  }

  const anyTag = nodeBuilder.or(
    tags.map((tag) =>
      nodeBuilder.is('metadata.routing_tags', nodeTypes.literal.buildNode(tag, true))
    )
  );
  return toKqlExpression(nodeBuilder.and([alertRules, anyTag]));
};
