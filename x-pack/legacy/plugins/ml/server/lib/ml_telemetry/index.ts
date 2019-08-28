/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export {
  createMlTelemetry,
  getSavedObjectsClient,
  incrementFileDataVisualizerIndexCreationCount,
  storeMlTelemetry,
  MlTelemetry,
  MlTelemetrySavedObject,
  ML_TELEMETRY_DOC_ID,
} from './ml_telemetry';
export { makeMlUsageCollector } from './make_ml_usage_collector';
