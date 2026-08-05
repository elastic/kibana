/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FindRulesResponse } from '@kbn/alerting-v2-schemas';
import { buildOasOperation } from '../oas_utils';
import type { AlertingOasOperationObject } from '../oas_types';
import { INVALID_QUERY_PARAMETERS_RESPONSE, RULE_RESPONSE } from './rule_oas_shared_examples';

export const LIST_RULES_RESPONSE: FindRulesResponse = {
  items: [RULE_RESPONSE],
  total: 1,
  page: 1,
  perPage: 20,
};

export const listRulesOasExamples = (): AlertingOasOperationObject =>
  buildOasOperation({
    responses: {
      200: {
        name: 'listRulesResponse',
        summary: 'Paginated list containing one matching rule',
        value: LIST_RULES_RESPONSE,
      },
      400: INVALID_QUERY_PARAMETERS_RESPONSE,
    },
  });
