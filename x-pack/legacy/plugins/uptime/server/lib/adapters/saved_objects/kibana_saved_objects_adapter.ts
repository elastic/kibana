/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMSavedObjectsAdapter } from './types';
import uptimeIndexPattern from './heartbeat_index_pattern.json';
import { umDynamicSettings, UMDynamicSettingsType } from '../../sources';

export const savedObjectsAdapter: UMSavedObjectsAdapter = {
  getUptimeIndexPattern: async client => {
    try {
      return await client.get('index-pattern', uptimeIndexPattern.id);
    } catch (error) {
      return await client.create(
        'index-pattern',
        {
          ...uptimeIndexPattern.attributes,
          title: 'UptimeIndexPattern',
        },
        { id: uptimeIndexPattern.id, overwrite: false }
      );
    }
  },
  getUptimeSourceSettings: async (client): Promise<UMDynamicSettingsType> => {
    try {
      return (await client.get(umDynamicSettings.type, umDynamicSettings.id)).attributes;
    } catch (e) {
      try {
        return (
          await client.create(umDynamicSettings.type, umDynamicSettings.defaults, {
            id: umDynamicSettings.id,
            overwrite: false,
          })
        ).attributes;
      } catch (e) {
        return e;
      }
    }
  },
  setUptimeSourceSettings: async (client, settings) => {
    // @ts-ignore
    client.update(umDynamicSettings.type, umDynamicSettings.id, settings);
  },
};
