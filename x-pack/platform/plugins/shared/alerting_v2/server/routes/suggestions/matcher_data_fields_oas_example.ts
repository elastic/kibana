/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MatcherDataFieldsResponse } from '@kbn/alerting-v2-schemas';
import { buildActionPolicyOas, type AlertingOasOperationObject } from '../oas_utils';
import { INVALID_QUERY_PARAMETERS_RESPONSE } from '../action_policies/action_policy_oas_shared_examples';

export const MATCHER_DATA_FIELDS_RESPONSE: MatcherDataFieldsResponse = [
  'host.name',
  'host.ip',
  'kibana.alert.rule.name',
];

export const matcherDataFieldsOasExamples = (): AlertingOasOperationObject =>
  buildActionPolicyOas({
    responses: {
      200: {
        name: 'matcherDataFieldsResponse',
        summary: 'Available matcher data fields',
        value: MATCHER_DATA_FIELDS_RESPONSE,
      },
      400: INVALID_QUERY_PARAMETERS_RESPONSE,
    },
  });
