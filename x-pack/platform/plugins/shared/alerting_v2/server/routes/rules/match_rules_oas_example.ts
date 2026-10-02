/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_PER_PAGE, type MatchRulesBody } from '@kbn/alerting-v2-schemas';
import type { AlertingOasOperationObject } from '../oas_types';
import { buildOasOperation, invalidResponseExample } from '../oas_utils';
import { INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION } from '../route_descriptions';
import { LIST_RULES_RESPONSE } from './list_rules_oas_example';

export const MATCH_RULES_REQUEST: MatchRulesBody = {
  matcher: { tags: ['production'] },
  page: 1,
  per_page: 20,
};

export const matchRulesOasExamples = (): AlertingOasOperationObject =>
  buildOasOperation({
    requestBody: {
      name: 'matchRulesRequest',
      summary: 'Policy scope to match rules against',
      value: MATCH_RULES_REQUEST,
    },
    responses: {
      200: {
        name: 'matchRulesResponse',
        summary: 'Paginated list of the rules matching the policy scope',
        value: LIST_RULES_RESPONSE,
      },
      400: invalidResponseExample({
        summary: INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION,
        message: `per_page: Too big: expected number to be <=${MAX_PER_PAGE}`,
        details: {
          errors: {
            errors: [],
            properties: {
              per_page: { errors: [`Too big: expected number to be <=${MAX_PER_PAGE}`] },
            },
          },
        },
      }),
    },
  });
