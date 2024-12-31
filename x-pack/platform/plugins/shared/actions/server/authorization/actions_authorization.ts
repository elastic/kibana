/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { KibanaRequest } from '@kbn/core/server';
import { SecurityPluginSetup } from '@kbn/security-plugin/server';
import {
  ACTION_SAVED_OBJECT_TYPE,
  ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE,
} from '../constants/saved_objects';
import { isBidirectionalConnectorType } from '../lib/bidirectional_connectors';

export interface ConstructorOptions {
  request: KibanaRequest;
  authorization?: SecurityPluginSetup['authz'];
}

const operationAlias: Record<string, (authorization: SecurityPluginSetup['authz']) => string[]> = {
  execute: (authorization) => [
    authorization.actions.savedObject.get(ACTION_SAVED_OBJECT_TYPE, 'get'),
    authorization.actions.savedObject.get(ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE, 'create'),
  ],
  list: (authorization) => [
    authorization.actions.savedObject.get(ACTION_SAVED_OBJECT_TYPE, 'find'),
  ],
};

export class ActionsAuthorization {
  private readonly request: KibanaRequest;
  private readonly authorization?: SecurityPluginSetup['authz'];

  constructor({ request, authorization }: ConstructorOptions) {
    this.request = request;
    this.authorization = authorization;
  }

  public async ensureAuthorized({
    operation,
    actionTypeId,
    additionalPrivileges = [],
  }: {
    operation: string;
    actionTypeId?: string;
    additionalPrivileges?: string[];
  }) {
    const { authorization } = this;
    if (authorization?.mode?.useRbacForRequest(this.request)) {
      const checkPrivileges = authorization.checkPrivilegesDynamicallyWithRequest(this.request);

      const privileges = operationAlias[operation]
        ? operationAlias[operation](authorization)
        : [authorization.actions.savedObject.get(ACTION_SAVED_OBJECT_TYPE, operation)];

      const { hasAllRequested } = await checkPrivileges({
        kibana: [
          ...privileges,
          ...additionalPrivileges,
          // SentinelOne and Crowdstrike sub-actions require that a user have `all` privilege to Actions and Connectors.
          // This is a temporary solution until a more robust RBAC approach can be implemented for sub-actions
          isBidirectionalConnectorType(actionTypeId)
            ? 'api:actions:execute-advanced-connectors'
            : 'api:actions:execute-basic-connectors',
        ],
      });
      if (!hasAllRequested) {
        throw Boom.forbidden(
          `Unauthorized to ${operation} ${actionTypeId ? `a "${actionTypeId}" action` : `actions`}`
        );
      }
    }
  }
}
