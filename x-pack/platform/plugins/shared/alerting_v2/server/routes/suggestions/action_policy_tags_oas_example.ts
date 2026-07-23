/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionPolicyTagsResponse } from '@kbn/alerting-v2-schemas';
import { invalidResponseExample, type AlertingOasOperationObject } from '../oas_utils';
import { INVALID_QUERY_PARAMETERS_DESCRIPTION } from '../route_descriptions';
import { buildActionPolicyOas } from '../action_policies/oas_utils';

export const ACTION_POLICY_TAGS_RESPONSE: ActionPolicyTagsResponse = [
  'production',
  'critical',
  'hosts',
];

const INVALID_ACTION_POLICY_TAGS_QUERY_RESPONSE = invalidResponseExample({
  summary: INVALID_QUERY_PARAMETERS_DESCRIPTION,
  message: 'search: Too small: expected string to have >=1 characters',
  details: {
    errors: {
      errors: [],
      properties: {
        search: { errors: ['Too small: expected string to have >=1 characters'] },
      },
    },
  },
});

export const actionPolicyTagsOasExamples = (): AlertingOasOperationObject =>
  buildActionPolicyOas({
    responses: {
      200: {
        name: 'actionPolicyTagsResponse',
        summary: 'Suggested action policy tags',
        value: ACTION_POLICY_TAGS_RESPONSE,
      },
      400: INVALID_ACTION_POLICY_TAGS_QUERY_RESPONSE,
    },
  });
