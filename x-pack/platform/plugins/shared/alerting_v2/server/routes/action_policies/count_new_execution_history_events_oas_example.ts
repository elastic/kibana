/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CountPolicyExecutionEventsResponse } from '@kbn/alerting-v2-schemas';
import { invalidResponseExample, type AlertingOasOperationObject } from '../oas_utils';
import { INVALID_QUERY_PARAMETERS_DESCRIPTION } from '../route_descriptions';
import { buildActionPolicyOas } from './oas_utils';

export const COUNT_EXECUTION_HISTORY_RESPONSE: CountPolicyExecutionEventsResponse = {
  count: 3,
};

const INVALID_COUNT_EXECUTION_EVENTS_QUERY_RESPONSE = invalidResponseExample({
  summary: INVALID_QUERY_PARAMETERS_DESCRIPTION,
  message: 'since: Invalid input: expected string, received undefined',
  details: {
    errors: {
      errors: [],
      properties: {
        since: { errors: ['Invalid input: expected string, received undefined'] },
      },
    },
  },
});

export const countActionPolicyExecutionHistoryOasExamples = (): AlertingOasOperationObject =>
  buildActionPolicyOas({
    responses: {
      200: {
        name: 'countActionPolicyExecutionHistoryResponse',
        summary: 'New execution events since the given timestamp',
        value: COUNT_EXECUTION_HISTORY_RESPONSE,
      },
      400: INVALID_COUNT_EXECUTION_EVENTS_QUERY_RESPONSE,
    },
  });
