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
import { RULE_TEMPLATE_SAVED_OBJECT_TYPE } from '../../../saved_objects';
import type { AlertingV1RawRuleTemplate } from '../../../saved_objects/schemas/raw_rule_template';
import {
  buildAlertingV1RuleTemplateEngineFilter,
  combineFilters,
} from '../../../rules_client/common/filters';

export interface FindRuleTemplatesSoParams {
  savedObjectsClient: SavedObjectsClientContract;
  savedObjectsFindOptions: Omit<SavedObjectsFindOptions, 'type'>;
}

/**
 * Finds Fleet / alerting v1 rule templates only (`engine: "v1"` or unset).
 */
export const findRuleTemplatesSo = (
  params: FindRuleTemplatesSoParams
): Promise<SavedObjectsFindResponse<AlertingV1RawRuleTemplate>> => {
  const { savedObjectsClient, savedObjectsFindOptions } = params;
  const filter = combineFilters([
    savedObjectsFindOptions.filter as KueryNode | undefined,
    buildAlertingV1RuleTemplateEngineFilter(),
  ]);

  return savedObjectsClient.find<AlertingV1RawRuleTemplate>({
    ...savedObjectsFindOptions,
    filter,
    type: RULE_TEMPLATE_SAVED_OBJECT_TYPE,
  });
};
