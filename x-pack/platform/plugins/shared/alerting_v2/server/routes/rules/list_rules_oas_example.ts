/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FindRulesResponse } from '@kbn/alerting-v2-schemas';
import { buildOasOperation, invalidResponseExample } from '../oas_utils';
import type { AlertingOasOperationObject } from '../oas_types';
import { RULE_RESPONSE } from './rule_oas_shared_examples';

export const LIST_RULES_RESPONSE: FindRulesResponse = {
  items: [RULE_RESPONSE],
  total: 1,
  page: 1,
  perPage: 20,
};

const INVALID_LIST_RULES_RESPONSE = invalidResponseExample({
  summary: 'List query uses an invalid page number',
  message: 'page: Number must be greater than or equal to 1',
  details: { errors: { page: ['Number must be greater than or equal to 1'] } },
});

export const listRulesOasExamples = (): AlertingOasOperationObject =>
  buildOasOperation({
    responses: {
      200: {
        name: 'listRulesResponse',
        summary: 'Paginated list containing one matching rule',
        value: LIST_RULES_RESPONSE,
      },
      400: INVALID_LIST_RULES_RESPONSE,
    },
  });
