/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';

export const LOG_ANALYSIS_VALIDATION_INDICES_PATH = '/api/infra/log_analysis/validation/indices';

/**
 * Request types
 */
export const validationIndicesRequestPayloadRT = rt.type({
  data: rt.type({
    timestamp: rt.string,
    indices: rt.string,
  }),
});

export type ValidationIndicesRequestPayload = rt.TypeOf<typeof validationIndicesRequestPayloadRT>;

/**
 * Response types
 * */
export const validationIndicesError = rt.type({
  index: rt.string,
  error: rt.keyof({ INDEX_NOT_FOUND: null, TIMESTAMP_NOT_FOUND: null, TIMESTAMP_NOT_VALID: null }),
  message: rt.string,
});
export type ValidationIndicesError = rt.TypeOf<typeof validationIndicesError>;

export const validationIndicesResponsePayloadRT = rt.type({
  data: rt.type({
    errors: rt.array(validationIndicesError),
  }),
});

export type ValidationIndicesResponsePayload = rt.TypeOf<typeof validationIndicesResponsePayloadRT>;
