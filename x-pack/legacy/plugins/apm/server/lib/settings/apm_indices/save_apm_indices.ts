/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
import { getSavedObjectsClient } from '../../helpers/saved_objects_client';
import {
  ApmIndicesConfig,
  APM_INDICES_SAVED_OBJECT_TYPE,
  APM_INDICES_SAVED_OBJECT_ID
} from './get_apm_indices';

export async function saveApmIndices(
  server: Server,
  apmIndicesSavedObject: Partial<ApmIndicesConfig>
) {
  const savedObjectsClient = getSavedObjectsClient(server, 'data');
  return await savedObjectsClient.create(
    APM_INDICES_SAVED_OBJECT_TYPE,
    apmIndicesSavedObject,
    {
      id: APM_INDICES_SAVED_OBJECT_ID,
      overwrite: true
    }
  );
}
