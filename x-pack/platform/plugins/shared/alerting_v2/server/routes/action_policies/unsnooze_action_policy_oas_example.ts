/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildActionPolicyOas, type AlertingOasOperationObject } from '../oas_utils';
import {
  ACTION_POLICY_NOT_FOUND_RESPONSE,
  ACTION_POLICY_VERSION_CONFLICT_RESPONSE,
  actionPolicyResponseExample,
} from './action_policy_oas_shared_examples';

export const unsnoozeActionPolicyOasExamples = (): AlertingOasOperationObject =>
  buildActionPolicyOas({
    responses: {
      200: actionPolicyResponseExample('unsnoozeActionPolicyResponse', 'Unsnoozed action policy', {
        snoozedUntil: null,
      }),
      404: ACTION_POLICY_NOT_FOUND_RESPONSE,
      409: ACTION_POLICY_VERSION_CONFLICT_RESPONSE,
    },
  });
