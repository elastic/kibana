/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  MatchActionPoliciesForRuleBody,
  MatchActionPoliciesForRuleResponse,
} from '@kbn/alerting-v2-schemas';
import type { AlertingOasOperationObject } from '../oas_types';
import { buildOasOperation, invalidResponseExample } from '../oas_utils';
import { INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION } from '../route_descriptions';
import { ACTION_POLICY_RESPONSE } from './action_policy_oas_shared_examples';

export const MATCH_ACTION_POLICIES_FOR_RULE_REQUEST: MatchActionPoliciesForRuleBody = {
  rule: {
    tags: ['production'],
  },
};

const TAGGED_ACTION_POLICY_RESPONSE = {
  ...ACTION_POLICY_RESPONSE,
  matcher: { tags: ['production'] },
};

export const MATCH_ACTION_POLICIES_FOR_RULE_RESPONSE: MatchActionPoliciesForRuleResponse = {
  items: [{ actionPolicy: TAGGED_ACTION_POLICY_RESPONSE, category: 'tags' }],
  total: 1,
};

export const matchActionPoliciesForRuleOasExamples = (): AlertingOasOperationObject =>
  buildOasOperation({
    requestBody: {
      name: 'matchActionPoliciesForRuleRequest',
      summary: 'Rule to match action policies against',
      value: MATCH_ACTION_POLICIES_FOR_RULE_REQUEST,
    },
    responses: {
      200: {
        name: 'matchActionPoliciesForRuleResponse',
        summary: 'Action policies matching the rule',
        value: MATCH_ACTION_POLICIES_FOR_RULE_RESPONSE,
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
