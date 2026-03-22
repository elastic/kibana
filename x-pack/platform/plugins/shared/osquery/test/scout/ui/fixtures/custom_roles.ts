/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Role } from '@kbn/scout';

/**
 * Custom roles for Compliance testing scenarios
 */
export const CUSTOM_ROLES = {
  /** User with read-only access to compliance features */
  complianceViewer: {
    name: 'compliance_viewer',
    privileges: {
      elasticsearch: {
        indices: [
          {
            names: ['.fleet-*', 'logs-osquery_manager*', 'compliance-findings-*'],
            privileges: ['read'],
          },
        ],
      },
      kibana: [
        {
          base: [],
          feature: {
            osquery: ['read'],
          },
          spaces: ['*'],
        },
      ],
    },
  } as Role,

  /** User with full access to compliance features */
  complianceEditor: {
    name: 'compliance_editor',
    privileges: {
      elasticsearch: {
        indices: [
          {
            names: ['.fleet-*', 'logs-osquery_manager*', 'compliance-findings-*'],
            privileges: ['read', 'write', 'manage'],
          },
        ],
      },
      kibana: [
        {
          base: [],
          feature: {
            osquery: ['all'],
            fleet: ['all'], // Needed for pack deployment
          },
          spaces: ['*'],
        },
      ],
    },
  } as Role,

  /** Admin user with compliance + Fleet admin privileges */
  complianceAdmin: {
    name: 'compliance_admin',
    privileges: {
      elasticsearch: {
        indices: [
          {
            names: ['*'],
            privileges: ['all'],
          },
        ],
      },
      kibana: [
        {
          base: ['all'],
          feature: {
            osquery: ['all'],
            fleet: ['all'],
          },
          spaces: ['*'],
        },
      ],
    },
  } as Role,
};
