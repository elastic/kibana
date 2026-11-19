/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteSecurity } from '@kbn/core-http-server';
import {
  WorkflowsManagementApiActions,
  WorkflowsManagementOperationPrivileges,
} from '@kbn/workflows';

export const SECRETS_MANAGE_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [...WorkflowsManagementOperationPrivileges.manageSecrets] },
};

/**
 * Names and descriptions, never values. Workflow authors need them to reference a secret,
 * and secret managers need them to manage one.
 */
export const SECRETS_LIST_SECURITY: RouteSecurity = {
  authz: {
    requiredPrivileges: [
      {
        anyRequired: [
          WorkflowsManagementApiActions.create,
          WorkflowsManagementApiActions.update,
          WorkflowsManagementApiActions.manageSecrets,
        ],
      },
    ],
  },
};
