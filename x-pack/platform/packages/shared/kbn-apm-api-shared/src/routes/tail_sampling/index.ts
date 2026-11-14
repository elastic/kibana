/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getTailSamplingRoute } from './get_tail_sampling';
import { validateTailSamplingRoute } from './validate_tail_sampling';
import { saveTailSamplingRoute } from './save_tail_sampling';
import { disableTailSamplingRoute } from './disable_tail_sampling';

export const tailSamplingRouteDefinitions = {
  get: getTailSamplingRoute,
  validate: validateTailSamplingRoute,
  save: saveTailSamplingRoute,
  disable: disableTailSamplingRoute,
};

export type {
  TailSamplingPolicy,
  TailSamplingConfig,
  TailSamplingProcessor,
  TailSamplingDiagnostic,
  TailSamplingWarning,
  TailSamplingWarningCode,
  TailSamplingResponse,
  ValidateTailSamplingResponse,
} from './types';
export {
  MAX_TAIL_SAMPLING_POLICIES,
  MAX_TAIL_SAMPLING_POLICY_NAME_LENGTH,
  TAIL_SAMPLING_PROCESSOR,
  TAIL_SAMPLING_POLICY_TYPES_WITH_WARNING,
  TAIL_SAMPLING_WARNING_CODES,
} from './types';
