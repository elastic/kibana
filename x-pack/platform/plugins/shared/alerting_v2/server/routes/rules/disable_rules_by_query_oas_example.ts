/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertingOasOperationObject } from '../oas_types';
import { buildOasOperation } from '../oas_utils';
import {
  BULK_BY_QUERY_REQUEST,
  DRY_RUN_RESPONSE,
  INVALID_BULK_BY_QUERY_RESPONSE,
} from './rule_oas_shared_examples';

export const disableRulesByQueryOasExamples = (): AlertingOasOperationObject =>
  buildOasOperation({
    requestBody: {
      name: 'disableRulesByQueryRequest',
      summary:
        'Disable rules tagged production (dry-run by default, or set `force: true` to execute)',
      value: BULK_BY_QUERY_REQUEST,
    },
    responses: {
      200: {
        name: 'disableRulesByQueryDryRunResponse',
        summary: 'Dry-run preview of matching rules; set `force: true` on the request to execute',
        value: DRY_RUN_RESPONSE,
      },
      400: INVALID_BULK_BY_QUERY_RESPONSE,
    },
  });
