/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';

export const LOG_ANALYSIS_VALIDATE_ML_MODULE_PATH = '/api/infra/log_analysis/ml_validate_module';

/**
 * Request types
 */
export const validateMlModuleRequestPayloadRT = rt.type({
  data: rt.type({
    timestamp: rt.string,
    indexPatternName: rt.string,
  }),
});

export type ValidateMlModuleRequestPayload = rt.TypeOf<typeof validateMlModuleRequestPayloadRT>;

/**
 * Response types
 * */

export const validateMlModuleError = rt.type({
  field: rt.keyof({ timestamp: null, indexPatternName: null }),
  message: rt.string,
});
export type ValidateMlModuleError = rt.TypeOf<typeof validateMlModuleError>;

export const validateMlModuleResponsePayloadRT = rt.type({
  data: rt.type({
    errors: rt.array(validateMlModuleError),
  }),
});

export type ValidateMlModuleResponsePayload = rt.TypeOf<typeof validateMlModuleResponsePayloadRT>;
