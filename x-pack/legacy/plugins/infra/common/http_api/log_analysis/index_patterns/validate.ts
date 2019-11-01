/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';

export const LOG_ANALYSIS_INDEX_PATTERNS_VALIDATE_PATH =
  '/api/infra/log_analysis/index_patterns/validate';

/**
 * Request types
 */
export const indexPatternsValidateRequestPayloadRT = rt.type({
  data: rt.type({
    timestamp: rt.string,
    indexPatternName: rt.string,
  }),
});

export type IndexPatternsValidateRequestPayload = rt.TypeOf<
  typeof indexPatternsValidateRequestPayloadRT
>;

/**
 * Response types
 * */
export const indexPatternValidateError = rt.type({
  indexPattern: rt.string,
  error: rt.keyof({ INDEX_NOT_FOUND: null, TIMESTAMP_NOT_FOUND: null, TIMESTAMP_NOT_VALID: null }),
  message: rt.string,
});
export type IndexPatternValidateError = rt.TypeOf<typeof indexPatternValidateError>;

export const indexPatternsValidateResponsePayloadRT = rt.type({
  data: rt.type({
    errors: rt.array(indexPatternValidateError),
  }),
});

export type IndexPatternsValidateResponsePayload = rt.TypeOf<
  typeof indexPatternsValidateResponsePayloadRT
>;
