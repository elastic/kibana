/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MatcherDataFieldsResponse } from '@kbn/alerting-v2-schemas';
import { invalidResponseExample, type AlertingOasOperationObject } from '../oas_utils';
import { INVALID_QUERY_PARAMETERS_DESCRIPTION } from '../route_descriptions';
import { buildActionPolicyOas } from '../action_policies/oas_utils';

export const MATCHER_DATA_FIELDS_RESPONSE: MatcherDataFieldsResponse = [
  'host.name',
  'host.ip',
  'kibana.alert.rule.name',
];

const INVALID_MATCHER_DATA_FIELDS_QUERY_RESPONSE = invalidResponseExample({
  summary: INVALID_QUERY_PARAMETERS_DESCRIPTION,
  message: 'matcher: Too small: expected string to have >=1 characters',
  details: {
    errors: {
      errors: [],
      properties: {
        matcher: { errors: ['Too small: expected string to have >=1 characters'] },
      },
    },
  },
});

export const matcherDataFieldsOasExamples = (): AlertingOasOperationObject =>
  buildActionPolicyOas({
    responses: {
      200: {
        name: 'matcherDataFieldsResponse',
        summary: 'Available matcher data fields',
        value: MATCHER_DATA_FIELDS_RESPONSE,
      },
      400: INVALID_MATCHER_DATA_FIELDS_QUERY_RESPONSE,
    },
  });
