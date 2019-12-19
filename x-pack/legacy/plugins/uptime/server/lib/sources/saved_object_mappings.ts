/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const uptimeSourceConfigurationSavedObjectType = 'uptime-ui-source-settings';
export const uptimeSourceConfigurationSavedObjectId = 'uptime-ui-source-settings';

export const defaultSourceConfiguration = {
    heartbeatIndexName: 'heartbeat-8.*'
};

export const uptimeSourceConfigurationSavedObjectMappings: any = {
  [uptimeSourceConfigurationSavedObjectType]: {
    properties: {
      heartbeatIndexName: {
        type: 'keyword',
      },
    },
  },
};
