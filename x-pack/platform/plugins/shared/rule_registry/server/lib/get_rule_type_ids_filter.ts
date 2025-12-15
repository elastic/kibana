/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ALERT_RULE_TYPE_ID } from '../../common/technical_rule_data_field_names';

export function getRuleTypeIdsFilter(ruleTypeIds?: string[]) {
  return ruleTypeIds && ruleTypeIds.length > 0
    ? { terms: { [ALERT_RULE_TYPE_ID]: ruleTypeIds } }
    : undefined;
}
