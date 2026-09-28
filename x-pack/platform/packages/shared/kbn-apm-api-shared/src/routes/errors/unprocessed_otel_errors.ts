/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z, lazySchema } from '@kbn/zod/v4';
import { environmentSchema } from '@kbn/apm-types';
import type { Error as ApmError } from '@kbn/apm-types';
import { MAX_SERVICE_NAME_LENGTH } from '../../constants';
import { defineRoute } from '../types';
import { kuerySchema, rangeSchema } from '../../default_api_types';

export interface UnprocessedOtelErrorsResponse {
  /** Raw unprocessed OTel exception log documents, up to MAX_UNPROCESSED_OTEL_ERRORS. */
  unprocessedOtelErrors: ApmError[];
  /**
   * True when the query matched more than MAX_UNPROCESSED_OTEL_ERRORS documents and the
   * list was truncated to the most recent N. Display a warning in the UI.
   */
  maxCountExceeded: boolean;
}

export const unprocessedOtelErrorsRoute = defineRoute<UnprocessedOtelErrorsResponse>()({
  endpoint: 'GET /internal/apm/services/{serviceName}/errors/unprocessed_otel',
  params: lazySchema(() =>
    z.object({
      path: z.object({ serviceName: z.string().max(MAX_SERVICE_NAME_LENGTH) }),
      query: z.object({}).merge(environmentSchema).merge(kuerySchema).merge(rangeSchema),
    })
  ),
});
