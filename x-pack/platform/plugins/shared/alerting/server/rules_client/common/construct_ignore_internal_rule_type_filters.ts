/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KueryNode } from '@kbn/es-query';
import { fromKueryExpression, nodeBuilder, toKqlExpression } from '@kbn/es-query';
import type { RegistryRuleType } from '../../rule_type_registry';
import { RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';

export const constructIgnoreInternalRuleTypesFilter = ({
  ruleTypes,
}: {
  ruleTypes: Map<string, RegistryRuleType>;
}) => {
  const internalRuleTypes = Array.from(ruleTypes.values()).filter((type) => type.internallyManaged);

  if (internalRuleTypes.length === 0) {
    return null;
  }

  const internalRuleTypeNode = nodeBuilder.or(
    internalRuleTypes.map((type) =>
      nodeBuilder.is(`${RULE_SAVED_OBJECT_TYPE}.attributes.alertTypeId`, type.id)
    )
  );

  const internalRuleTypeNodesAsExpression = toKqlExpression(internalRuleTypeNode);
  const ignoreInternalRuleTypes = `not ${internalRuleTypeNodesAsExpression}`;

  return fromKueryExpression(ignoreInternalRuleTypes);
};

export const combineFiltersWithInternalRuleTypeFilter = ({
  filter,
  internalRuleTypeFilter,
}: {
  filter: KueryNode | null;
  internalRuleTypeFilter: KueryNode | null;
}) => {
  if (!filter && !internalRuleTypeFilter) {
    return null;
  }

  if (!filter) {
    return internalRuleTypeFilter;
  }

  if (!internalRuleTypeFilter) {
    return filter;
  }

  return nodeBuilder.and([filter, internalRuleTypeFilter]);
};
