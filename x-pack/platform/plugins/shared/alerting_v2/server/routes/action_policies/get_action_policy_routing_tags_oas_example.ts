/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionPolicyRoutingTagsResponse } from '@kbn/alerting-v2-schemas';
import type { AlertingOasOperationObject } from '../oas_types';
import { buildOasOperation, invalidResponseExample } from '../oas_utils';
import { INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION } from '../route_descriptions';

export const ACTION_POLICY_ROUTING_TAGS_RESPONSE: ActionPolicyRoutingTagsResponse = {
  items: [
    {
      tag: 'sre-oncall',
      policy_count: 7,
      policies: [
        { id: 'a1b2c3d4-0000-4000-8000-000000000001', name: 'Page the SRE on call' },
        { id: 'a1b2c3d4-0000-4000-8000-000000000002', name: 'Post to #sre-alerts' },
      ],
    },
  ],
  total_tags: 37,
  is_truncated: false,
};

export const getActionPolicyRoutingTagsOasExamples = (): AlertingOasOperationObject =>
  buildOasOperation({
    responses: {
      200: {
        name: 'actionPolicyRoutingTagsResponse',
        summary: 'Routing tags used by action policies',
        value: ACTION_POLICY_ROUTING_TAGS_RESPONSE,
      },
      400: invalidResponseExample({
        summary: INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION,
        message: 'policies_per_tag: Too big: expected number to be <=20',
        details: {
          errors: {
            errors: [],
            properties: {
              policies_per_tag: { errors: ['Too big: expected number to be <=20'] },
            },
          },
        },
      }),
    },
  });
