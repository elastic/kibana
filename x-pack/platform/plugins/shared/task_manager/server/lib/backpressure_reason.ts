/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { isEsCannotExecuteScriptError } from './identify_es_error';
import { getBulkUpdateStatusCode, getMsearchStatusCode, isClusterBlockException } from './errors';

/** The category of Elasticsearch-pressure error that makes Task Manager back off (reduce capacity / lengthen the poll interval). */
export type BackpressureReason =
  | 'cluster_block'
  | 'too_many_requests'
  | 'es_unavailable'
  | 'script_error'
  | 'msearch_5xx'
  | 'bulk_5xx'
  | 'general_error';

/** Classifies an error into the backpressure reason it triggers, or `null` if Task Manager would not back off (checked most- to least-specific). */
export function getBackpressureReason(error: Error): BackpressureReason | null {
  if (isClusterBlockException(error)) {
    return 'cluster_block';
  }
  if (
    SavedObjectsErrorHelpers.isTooManyRequestsError(error) ||
    getMsearchStatusCode(error) === 429 ||
    getBulkUpdateStatusCode(error) === 429
  ) {
    return 'too_many_requests';
  }
  if (SavedObjectsErrorHelpers.isEsUnavailableError(error)) {
    return 'es_unavailable';
  }
  if (isEsCannotExecuteScriptError(error)) {
    return 'script_error';
  }
  const msearchStatusCode = getMsearchStatusCode(error);
  if (msearchStatusCode !== undefined && msearchStatusCode >= 500) {
    return 'msearch_5xx';
  }
  const bulkUpdateStatusCode = getBulkUpdateStatusCode(error);
  if (bulkUpdateStatusCode !== undefined && bulkUpdateStatusCode >= 500) {
    return 'bulk_5xx';
  }
  if (SavedObjectsErrorHelpers.isGeneralError(error)) {
    return 'general_error';
  }
  return null;
}
