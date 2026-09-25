/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  MatchActionPoliciesBody,
  MatchActionPoliciesResponse,
} from '@kbn/alerting-v2-schemas';
import type { AlertingOasOperationObject } from '../oas_types';
import { buildOasOperation, invalidResponseExample } from '../oas_utils';
import { INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION } from '../route_descriptions';
import { ACTION_POLICY_RESPONSE } from './action_policy_oas_shared_examples';

export const MATCH_ACTION_POLICIES_REQUEST: MatchActionPoliciesBody = {
  rule: {
    tags: ['production'],
  },
};

const TAGGED_ACTION_POLICY_RESPONSE = {
  ...ACTION_POLICY_RESPONSE,
  matcher: { tags: ['production'] },
};

export const MATCH_ACTION_POLICIES_RESPONSE: MatchActionPoliciesResponse = {
  items: [{ action_policy: TAGGED_ACTION_POLICY_RESPONSE, category: 'tags' }],
  evaluated_count: 1,
  is_truncated: false,
};

export const matchActionPoliciesOasExamples = (): AlertingOasOperationObject =>
  buildOasOperation({
    requestBody: {
      name: 'matchActionPoliciesRequest',
      summary: 'Rule to match action policies against',
      value: MATCH_ACTION_POLICIES_REQUEST,
    },
    responses: {
      200: {
        name: 'matchActionPoliciesResponse',
        summary: 'Action policies matching the rule',
        value: MATCH_ACTION_POLICIES_RESPONSE,
      },
      400: invalidResponseExample({
        summary: INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION,
        message: 'rule: Invalid input: expected object, received undefined',
        details: {
          errors: {
            errors: [],
            properties: {
              rule: { errors: ['Invalid input: expected object, received undefined'] },
            },
          },
        },
      }),
    },
  });
