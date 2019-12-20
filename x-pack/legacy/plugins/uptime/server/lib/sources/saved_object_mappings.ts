/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface UMDynamicSettingsType {
  heartbeatIndexName: string;
}

const type = 'uptime-dynamic-settings';

export const umDynamicSettings = {
  type,
  id: 'uptime-dynamic-settings-singleton',
  defaults: {
    heartbeatIndexName: 'heartbeat-8.*',
  },
  mapping: {
    [type]: {
      properties: {
        heartbeatIndexName: {
          type: 'keyword',
        },
      },
    },
  },
};
