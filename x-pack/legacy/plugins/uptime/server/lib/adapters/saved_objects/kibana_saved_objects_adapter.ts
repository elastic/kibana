/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMSavedObjectsAdapter } from './types';
import { UPTIME_INDEX_PATTERN } from '../../../../common/constants';

export const savedObjectsAdapter: UMSavedObjectsAdapter = {
  getUptimeIndexPattern: async client => {
    try {
      return await client.get('index-pattern', UPTIME_INDEX_PATTERN);
    } catch (error) {
      return await client.create(
        'index-pattern',
        {
          timeFieldName: '@timestamp',
          title: 'heartbeat-8*',
          fields: '[]',
        },
        { id: UPTIME_INDEX_PATTERN, overwrite: false }
      );
    }
  },
};
