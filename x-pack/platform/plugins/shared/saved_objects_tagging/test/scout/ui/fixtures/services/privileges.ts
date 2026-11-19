/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout';

export const getSavedObjectsTaggingReadRole = (): KibanaRole => ({
  kibana: [
    {
      base: [],
      feature: {
        savedObjectsTagging: ['read'],
      },
      spaces: ['default'],
    },
  ],
  elasticsearch: {
    cluster: [],
  },
});

export const getSavedObjectsTaggingWriteRole = (): KibanaRole => ({
  kibana: [
    {
      base: [],
      feature: {
        savedObjectsTagging: ['all'],
      },
      spaces: ['default'],
    },
  ],
  elasticsearch: {
    cluster: [],
  },
});

export const getSavedObjectsTaggingReadWithSavedObjectsManagementReadRole = (): KibanaRole => ({
  kibana: [
    {
      base: [],
      feature: {
        savedObjectsTagging: ['read'],
        savedObjectsManagement: ['read'],
      },
      spaces: ['default'],
    },
  ],
  elasticsearch: {
    cluster: [],
  },
});

export const getDefaultSpaceWriteRole = (): KibanaRole => ({
  kibana: [
    {
      base: ['all'],
      feature: {},
      spaces: ['default'],
    },
  ],
  elasticsearch: {
    cluster: [],
  },
});

export const getNoSavedObjectsTaggingAccessRole = (): KibanaRole => ({
  kibana: [
    {
      base: [],
      feature: {
        discover: ['read'],
      },
      spaces: ['default'],
    },
  ],
  elasticsearch: {
    cluster: [],
  },
});
