/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ErrorResponse } from '@kbn/alerting-v2-schemas';
import type { OasExampleEntry } from './oas_types';

export const jsonExample = <T>(name: string, summary: string, value: T) => ({
  content: {
    'application/json': {
      examples: {
        [name]: {
          summary,
          value,
        },
      },
    },
  },
});

/**
 * Validation errors currently return Kibana core's Boom shape, but Core will
 * align them with `ErrorResponse` (see https://github.com/elastic/kibana/issues/265514).
 * Document the target `ErrorResponse` shape so these examples stay correct once that lands.
 */
export const invalidResponseExample = ({
  summary,
  message,
  details,
  code = 'BAD_REQUEST',
}: {
  summary: string;
  message: string;
  details?: ErrorResponse['details'];
  code?: string;
}): OasExampleEntry => ({
  name: 'invalidRequest',
  summary,
  value: {
    code,
    error: 'Bad Request',
    message,
    ...(details !== undefined ? { details } : {}),
  } satisfies ErrorResponse,
});
