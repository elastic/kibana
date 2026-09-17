/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { TransportResult } from '@elastic/elasticsearch';

/** Builds the `ResponseError` the ES client throws for a failed request, with the given ES error body. */
export const createEsResponseError = (
  statusCode: number,
  type: string,
  reason: string
): errors.ResponseError =>
  new errors.ResponseError({
    statusCode,
    headers: {},
    warnings: [],
    meta: {} as unknown as TransportResult['meta'],
    body: { error: { type, reason } },
  } as TransportResult);
