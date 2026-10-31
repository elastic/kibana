/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AccessPolicy } from '@kbn/access-control';

/**
 * Object-level access policy for connectors. Connectors are public by default; a connector can be
 * private, or let everyone run it while only its owner edits it. Named grants let people run a
 * connector. Editing and deleting need `edit`, which only the owner and general access can give.
 *
 * Each operation is also capped by the feature privileges it lists, the same ones Actions checks.
 */
export const CONNECTOR_ACCESS_POLICY: AccessPolicy = {
  generalAccess: { default: 'edit', allowed: ['none', 'use', 'edit'] },
  entryLevels: ['use'],
  operations: {
    view: { level: 'view', privileges: { savedObject: [{ type: 'action', operation: 'get' }] } },
    use: {
      level: 'use',
      privileges: {
        savedObject: [
          { type: 'action', operation: 'get' },
          { type: 'action_task_params', operation: 'create' },
        ],
      },
    },
    edit: { level: 'edit', privileges: { savedObject: [{ type: 'action', operation: 'update' }] } },
    delete: {
      level: 'edit',
      privileges: { savedObject: [{ type: 'action', operation: 'delete' }] },
    },
  },
};
