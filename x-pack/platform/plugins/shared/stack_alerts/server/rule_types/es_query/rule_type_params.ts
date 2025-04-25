/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { RuleTypeState } from '@kbn/alerting-plugin/server';
import { type EsQueryRuleParams } from '@kbn/response-ops-rule-params/es_query';
import type { SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import type { AlertInstanceState as AlertState } from '@kbn/alerting-plugin/common';
import { ES_QUERY_MAX_HITS_PER_EXECUTION_SERVERLESS } from '../../../common';

export interface EsQueryRuleState extends RuleTypeState {
  latestTimestamp: string | undefined;
}

export type EsQueryAlertState = AlertState;

export type EsQueryRuleParamsExtractedParams = Omit<EsQueryRuleParams, 'searchConfiguration'> & {
  searchConfiguration: SerializedSearchSourceFields & {
    indexRefName: string;
  };
};

export function validateServerless(params: EsQueryRuleParams) {
  const { size } = params;
  if (size > ES_QUERY_MAX_HITS_PER_EXECUTION_SERVERLESS) {
    throw new Error(
      i18n.translate('xpack.stackAlerts.esQuery.serverless.sizeErrorMessage', {
        defaultMessage: '[size]: must be less than or equal to {maxSize}',
        values: {
          maxSize: ES_QUERY_MAX_HITS_PER_EXECUTION_SERVERLESS,
        },
      })
    );
  }
}
