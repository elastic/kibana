/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionPolicyTagsResponse } from '@kbn/alerting-v2-schemas';
import { buildOasOperation, invalidResponseExample } from '../oas_utils';
import type { AlertingOasOperationObject } from '../oas_types';
import { INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION } from '../route_descriptions';

export const ACTION_POLICY_TAGS_RESPONSE: ActionPolicyTagsResponse = [
  'production',
  'critical',
  'hosts',
];

const INVALID_ACTION_POLICY_TAGS_QUERY_RESPONSE = invalidResponseExample({
  summary: INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION,
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
  buildOasOperation({
    responses: {
      200: {
        name: 'actionPolicyTagsResponse',
        summary: 'Suggested action policy tags',
        value: ACTION_POLICY_TAGS_RESPONSE,
      },
      400: INVALID_ACTION_POLICY_TAGS_QUERY_RESPONSE,
    },
  });
