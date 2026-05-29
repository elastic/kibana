/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout';

export const CCR_TAGS = ['@local-stateful-classic', '@cloud-stateful-classic'];

export const CCR_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: ['manage', 'manage_ccr'],
  },
  kibana: [
    {
      base: ['all'],
      feature: {},
      spaces: ['*'],
    },
  ],
};

export const KIBANA_ADMIN_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: [],
  },
  kibana: [
    {
      base: ['all'],
      feature: {},
      spaces: ['*'],
    },
  ],
};

export const CCR_USER_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: ['manage', 'manage_ccr'],
  },
  kibana: [
    {
      base: [],
      feature: {
        dashboard: ['read'],
      },
      spaces: ['*'],
    },
  ],
};
