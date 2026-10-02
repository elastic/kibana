/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';

/** Builds the error the ES client throws when Elasticsearch rejects an ES|QL request. */
export const createEsqlResponseError = (
  type: string,
  reason: string,
  statusCode = 400
): errors.ResponseError =>
  new errors.ResponseError({
    statusCode,
    body: { error: { type, reason } },
    warnings: null,
    meta: {} as never,
  } as never);
