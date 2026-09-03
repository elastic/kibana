/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { MS_PER_DAY } from './iteration_state';
export { deriveSuccessCount, deriveTotalTokensUsed } from './iteration_state';

export { identifyInferredFeatures, buildTelemetry } from './identify_inferred_features';
export type {
  FeaturesIdentifiedTelemetry,
  TelemetryContext,
  IdentifyInferredFeaturesOptions,
  IdentifyInferredFeaturesResult,
} from './identify_inferred_features';

export {
  MAX_INFERENCE_DOCUMENTS_BYTES,
  MAX_INFERENCE_DOCUMENT_BYTES,
  MAX_INFERENCE_DOCUMENT_FIELDS,
  MAX_INFERENCE_FIELD_NAME_LENGTH,
  prepareInferredSampling,
} from './prepare_inferred_sampling';
export type { PrepareInferredSamplingResult } from './prepare_inferred_sampling';

export { identifyComputedFeatures } from './identify_computed_features';
export type {
  IdentifyComputedFeaturesOptions,
  IdentifyComputedFeaturesResult,
} from './identify_computed_features';
