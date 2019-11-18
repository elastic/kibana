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
    timestampField: rt.string,
    indices: rt.array(rt.string),
  }),
});

export type ValidationIndicesRequestPayload = rt.TypeOf<typeof validationIndicesRequestPayloadRT>;

/**
 * Response types
 * */
export const validationIndicesErrorRT = rt.union([
  rt.type({
    error: rt.literal('INDEX_NOT_FOUND'),
    index: rt.string,
  }),
  rt.type({
    error: rt.literal('TIMESTAMP_NOT_FOUND'),
    index: rt.string,
    timestampField: rt.string,
  }),
  rt.type({
    error: rt.literal('TIMESTAMP_NOT_VALID'),
    index: rt.string,
    timestampField: rt.string,
  }),
]);

export type ValidationIndicesError = rt.TypeOf<typeof validationIndicesErrorRT>;

export const validationIndicesResponsePayloadRT = rt.type({
  data: rt.type({
    errors: rt.array(validationIndicesErrorRT),
  }),
});

export type ValidationIndicesResponsePayload = rt.TypeOf<typeof validationIndicesResponsePayloadRT>;
