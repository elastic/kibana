/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KueryNode, nodeBuilder } from '@kbn/es-query';
import { RULE_SAVED_OBJECT_TYPE } from '../..';

export const NodeBuilderOperators = {
  and: 'and',
  or: 'or',
} as const;

type NodeBuilderOperatorsType = keyof typeof NodeBuilderOperators;

interface FilterField {
  filters?: string | string[];
  field: string;
  operator: NodeBuilderOperatorsType;
  type?: string;
}

export const buildFilter = ({
  filters,
  field,
  operator,
  type = RULE_SAVED_OBJECT_TYPE,
}: FilterField): KueryNode | undefined => {
  if (filters === undefined) {
    return;
  }

  const filtersAsArray = Array.isArray(filters) ? filters : [filters];

  if (filtersAsArray.length === 0) {
    return;
  }

  return nodeBuilder[operator](
    filtersAsArray.map((filter) => nodeBuilder.is(`${type}.attributes.${field}`, filter))
  );
};

export const buildRuleTypeIdsFilter = (ruleTypeIds?: string[]) => {
  if (!ruleTypeIds || !ruleTypeIds?.length) {
    return;
  }

  return buildFilter({ filters: ruleTypeIds, field: 'alertTypeId', operator: 'or' });
};

export const buildConsumersFilter = (consumers?: string[]) => {
  if (!consumers || !consumers?.length) {
    return;
  }

  return buildFilter({ filters: consumers, field: 'consumer', operator: 'or' });
};

/**
 * Combines Kuery nodes and accepts an array with a mixture of undefined and KueryNodes. This will filter out the undefined
 * filters and return a KueryNode with the filters combined using the specified operator which defaults to and if not defined.
 */
export function combineFilters(
  nodes: Array<KueryNode | undefined | null>,
  operator: NodeBuilderOperatorsType = NodeBuilderOperators.and
): KueryNode | undefined {
  const filters = nodes.filter(Boolean) as KueryNode[];

  if (filters.length <= 0) {
    return;
  }

  return nodeBuilder[operator](filters);
}

export const combineFilterWithAuthorizationFilter = (
  filter?: KueryNode,
  authorizationFilter?: KueryNode
) => {
  if (!filter && !authorizationFilter) {
    return;
  }

  const kueries = [
    ...(filter !== undefined ? [filter] : []),
    ...(authorizationFilter !== undefined ? [authorizationFilter] : []),
  ];
  return nodeBuilder.and(kueries);
};
