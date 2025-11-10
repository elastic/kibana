/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleTypeState } from '@kbn/alerting-plugin/server';
import { type EsqlRuleParams } from '@kbn/response-ops-rule-params/esql';
import type { SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import type { AlertInstanceState as AlertState } from '@kbn/alerting-plugin/common';

export type EsqlRuleState = RuleTypeState;

export type EsqlAlertState = AlertState;

export type EsqlRuleParamsExtractedParams = Omit<EsqlRuleParams, 'searchConfiguration'> & {
  searchConfiguration: SerializedSearchSourceFields & {
    indexRefName: string;
  };
};

export function validateServerless(params: EsqlRuleParams) {
  return;
}
