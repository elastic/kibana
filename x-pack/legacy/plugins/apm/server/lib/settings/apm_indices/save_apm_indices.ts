/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ApmIndicesConfig, ScopedSavedObjectsClient } from './get_apm_indices';
import {
  APM_INDICES_SAVED_OBJECT_TYPE,
  APM_INDICES_SAVED_OBJECT_ID
} from '../../../../common/apm_saved_object_constants';

export async function saveApmIndices(
  savedObjectsClient: ScopedSavedObjectsClient,
  apmIndicesSavedObject: Partial<ApmIndicesConfig>
) {
  return await savedObjectsClient.create(
    APM_INDICES_SAVED_OBJECT_TYPE,
    apmIndicesSavedObject,
    {
      id: APM_INDICES_SAVED_OBJECT_ID,
      overwrite: true
    }
  );
}
