/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getManagedTailSamplingRoute } from './get_managed_tail_sampling';
import { validateManagedTailSamplingRoute } from './validate_managed_tail_sampling';
import { saveManagedTailSamplingRoute } from './save_managed_tail_sampling';
import { disableManagedTailSamplingRoute } from './disable_managed_tail_sampling';

export const managedTailSamplingRouteDefinitions = {
  get: getManagedTailSamplingRoute,
  validate: validateManagedTailSamplingRoute,
  save: saveManagedTailSamplingRoute,
  disable: disableManagedTailSamplingRoute,
};

export type {
  TailSamplingPolicy,
  TailSamplingDiagnostic,
  ManagedTailSamplingResponse,
  ValidateManagedTailSamplingResponse,
} from './types';
export {
  MAX_TAIL_SAMPLING_POLICIES,
  MAX_TAIL_SAMPLING_POLICY_NAME_LENGTH,
  TAIL_SAMPLING_HASH_LENGTH,
} from './types';
