/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObjectsClientContract,
  SavedObjectsFindOptions,
  SavedObjectsFindResponse,
} from '@kbn/core/server';
import type { KueryNode } from '@kbn/es-query';
import { fromKueryExpression, nodeBuilder, toKqlExpression } from '@kbn/es-query';
import { RULE_TEMPLATE_SAVED_OBJECT_TYPE } from '../../../saved_objects';
import type { AlertingV1RawRuleTemplate } from '../../../saved_objects/schemas/raw_rule_template';

export interface FindRuleTemplatesSoParams {
  savedObjectsClient: SavedObjectsClientContract;
  savedObjectsFindOptions: Omit<SavedObjectsFindOptions, 'type'>;
}

const buildExcludeAlertingV2EngineFilter = (): KueryNode => {
  const engineIsV2 = nodeBuilder.is(`${RULE_TEMPLATE_SAVED_OBJECT_TYPE}.attributes.engine`, 'v2');
  return fromKueryExpression(`not ${toKqlExpression(engineIsV2)}`);
};

const combineFilters = (nodes: Array<KueryNode | undefined>): KueryNode | undefined => {
  const filters = nodes.filter((node): node is KueryNode => node != null);
  if (filters.length === 0) {
    return undefined;
  }
  if (filters.length === 1) {
    return filters[0];
  }
  return nodeBuilder.and(filters);
};

/**
 * Finds Fleet / alerting v1 rule templates only (`engine` is not `"v2"`).
 */
export const findRuleTemplatesSo = (
  params: FindRuleTemplatesSoParams
): Promise<SavedObjectsFindResponse<AlertingV1RawRuleTemplate>> => {
  const { savedObjectsClient, savedObjectsFindOptions } = params;
  const filter = combineFilters([
    savedObjectsFindOptions.filter as KueryNode | undefined,
    buildExcludeAlertingV2EngineFilter(),
  ]);

  return savedObjectsClient.find<AlertingV1RawRuleTemplate>({
    ...savedObjectsFindOptions,
    filter,
    type: RULE_TEMPLATE_SAVED_OBJECT_TYPE,
  });
};
