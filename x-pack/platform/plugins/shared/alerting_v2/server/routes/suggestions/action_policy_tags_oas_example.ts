/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionPolicyTagsResponse } from '@kbn/alerting-v2-schemas';
import { buildActionPolicyOas, type AlertingOasOperationObject } from '../oas_utils';
import { INVALID_QUERY_PARAMETERS_RESPONSE } from '../action_policies/action_policy_oas_shared_examples';

export const ACTION_POLICY_TAGS_RESPONSE: ActionPolicyTagsResponse = [
  'production',
  'critical',
  'hosts',
];

export const actionPolicyTagsOasExamples = (): AlertingOasOperationObject =>
  buildActionPolicyOas({
    responses: {
      200: {
        name: 'actionPolicyTagsResponse',
        summary: 'Suggested action policy tags',
        value: ACTION_POLICY_TAGS_RESPONSE,
      },
      400: INVALID_QUERY_PARAMETERS_RESPONSE,
    },
  });
