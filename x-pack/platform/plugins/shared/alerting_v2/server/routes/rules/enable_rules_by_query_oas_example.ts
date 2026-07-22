/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertingOasOperationObject } from '../json_oas_example';
import {
  BULK_BY_QUERY_REQUEST,
  DRY_RUN_RESPONSE,
  INVALID_RULE_DATA_EXAMPLE,
  buildRuleOas,
} from './rule_oas_shared';

export const enableRulesByQueryOasExamples = (): AlertingOasOperationObject =>
  buildRuleOas({
    requestBody: {
      name: 'enableRulesByQueryRequest',
      summary:
        'Enable rules tagged production (dry-run by default, or set `force: true` to execute)',
      value: BULK_BY_QUERY_REQUEST,
    },
    responses: {
      200: {
        name: 'enableRulesByQueryDryRunResponse',
        summary: 'Dry-run preview of matching rules; set `force: true` on the request to execute',
        value: DRY_RUN_RESPONSE,
      },
      400: INVALID_RULE_DATA_EXAMPLE,
    },
  });
