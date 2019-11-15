/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Server } from 'hapi';
import { getInternalSavedObjectsClient } from '../helpers/saved_objects_client';
import apmIndexPattern from '../../../../../../../src/legacy/core_plugins/kibana/server/tutorials/apm/index_pattern.json';

export async function getAPMIndexPattern(server: Server) {
  const config = server.config();
  const apmIndexPatternTitle = config.get('apm_oss.indexPattern');
  const internalSavedObjectsClient = getInternalSavedObjectsClient(server);
  try {
    return await internalSavedObjectsClient.get(
      'index-pattern',
      apmIndexPattern.id
    );
  } catch (error) {
    // if GET fails, then create a new index pattern saved object
    return await internalSavedObjectsClient.create(
      'index-pattern',
      {
        ...apmIndexPattern.attributes,
        title: apmIndexPatternTitle
      },
      { id: apmIndexPattern.id, overwrite: false }
    );
  }
}
