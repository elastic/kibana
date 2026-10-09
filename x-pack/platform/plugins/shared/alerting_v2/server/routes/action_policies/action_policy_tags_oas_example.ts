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

export const ACTION_POLICY_TAGS_RESPONSE: ActionPolicyTagsResponse = {
  tags: ['production', 'critical', 'hosts'],
};

const INVALID_ACTION_POLICY_TAGS_QUERY_RESPONSE = invalidResponseExample({
  summary: INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION,
  message: 'search: Too big: expected string to have <=256 characters',
  details: {
    errors: {
      errors: [],
      properties: {
        search: { errors: ['Too big: expected string to have <=256 characters'] },
      },
    },
  },
});

export const actionPolicyTagsOasExamples = (): AlertingOasOperationObject =>
  buildOasOperation({
    responses: {
      200: {
        name: 'actionPolicyTagsResponse',
        summary: 'Action policy tags',
        value: ACTION_POLICY_TAGS_RESPONSE,
      },
      400: INVALID_ACTION_POLICY_TAGS_QUERY_RESPONSE,
    },
  });
