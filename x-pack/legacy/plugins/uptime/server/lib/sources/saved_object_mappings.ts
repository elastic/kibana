/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const uptimeSourceConfigurationSavedObjectType = 'uptime-ui-source';
export const uptimeSourceConfigurationSavedObjectId = 'uptime-ui-source-singleton';

export const defaultSourceSettings = {
  heartbeatIndexName: 'heartbeat-8.*',
};

export const uptimeSourceSettingsSavedObjectMappings: any = {
  [uptimeSourceConfigurationSavedObjectType]: {
    properties: {
      name: {
        type: 'text',
      },
      description: {
        type: 'text',
      },
      heartbeatIndexName: {
        type: 'keyword',
      },
    },
  },
};
