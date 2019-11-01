/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import uptimeIndexPattern from './heartbeat_index_pattern.json';
import { UMSavedObjectsAdapter } from './types.js';

export const UMKibanaSavedObjectsAdapter: UMSavedObjectsAdapter = {
  getUptimeIndexPattern: async (request: any): Promise<any> => {
    let savedObjectsClient: any;
    try {
      savedObjectsClient = request.getSavedObjectsClient();
    } catch (error) {
      throw Boom.internal('Unable to get saved objects client');
    }
    try {
      return await savedObjectsClient.get('index-pattern', uptimeIndexPattern.id);
    } catch (error) {
      return await savedObjectsClient.create(
        'index-pattern',
        {
          ...uptimeIndexPattern.attributes,
          title: 'UptimeIndexPattern',
        },
        { id: uptimeIndexPattern.id, overwrite: false }
      );
    }
  },
};
