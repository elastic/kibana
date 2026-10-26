/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { KibanaRequest } from '@kbn/core/server';
import { fromKueryExpression, nodeBuilder, type KueryNode } from '@kbn/es-query';
import type { SecurityPluginSetup } from '@kbn/security-plugin/server';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import type { SpacesServiceSetup } from '@kbn/spaces-plugin/server';
import {
  ACTION_SAVED_OBJECT_TYPE,
  ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE,
} from '../constants/saved_objects';
import { AuthorizationMode } from './get_authorization_mode_by_source';

export interface ConstructorOptions {
  request: KibanaRequest;
  authorization?: SecurityPluginSetup['authz'];
  // In order to support legacy Alerts which predate the introduction of the
  // Actions feature in Kibana we need a way of "dialing down" the level of
  // authorization for certain opearations.
  // Specifically, we want to allow these old alerts and their scheduled
  // actions to continue to execute - which requires that we exempt auth on
  // `get` for Connectors and `execute` for Action execution when used by
  // these legacy alerts
  authorizationMode?: AuthorizationMode;
  spaces?: SpacesServiceSetup;
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

const LEGACY_RBAC_EXEMPT_OPERATIONS = new Set(['get', 'execute']);

export class ActionsAuthorization {
  private readonly request: KibanaRequest;
  private readonly authorization?: SecurityPluginSetup['authz'];
  private readonly authorizationMode: AuthorizationMode;
  private readonly spaces?: SpacesServiceSetup;

  constructor({
    request,
    authorization,
    authorizationMode = AuthorizationMode.RBAC,
    spaces,
  }: ConstructorOptions) {
    this.request = request;
    this.authorization = authorization;
    this.authorizationMode = authorizationMode;
    this.spaces = spaces;
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
      if (!this.isOperationExemptDueToLegacyRbac(operation)) {
        const checkPrivileges = authorization.checkPrivilegesDynamicallyWithRequest(this.request);

        const privileges = operationAlias[operation]
          ? operationAlias[operation](authorization)
          : [authorization.actions.savedObject.get(ACTION_SAVED_OBJECT_TYPE, operation)];

        const { hasAllRequested } = await checkPrivileges({
          kibana: [...privileges, ...additionalPrivileges],
        });
        if (!hasAllRequested) {
          throw Boom.forbidden(
            `Unauthorized to ${operation} ${
              actionTypeId ? `a "${actionTypeId}" action` : `actions`
            }`
          );
        }
      }
    }
  }

  private isOperationExemptDueToLegacyRbac(operation: string) {
    return (
      this.authorizationMode === AuthorizationMode.Legacy &&
      LEGACY_RBAC_EXEMPT_OPERATIONS.has(operation)
    );
  }

  public async getFindAuthorizationFilter({
    operation,
    namespaces,
  }: {
    operation: string;
    namespaces?: Array<string | undefined>;
  }): Promise<{ filter: KueryNode }> {
    const spaces =
      namespaces && namespaces.length > 0
        ? namespaces.map((space) => (space === undefined ? DEFAULT_SPACE_ID : space))
        : [this.spaces?.getSpaceId(this.request) ?? DEFAULT_SPACE_ID];

    if (
      !this.authorization?.mode?.useRbacForRequest(this.request) ||
      this.isOperationExemptDueToLegacyRbac(operation)
    ) {
      return { filter: this.buildFilterForAuthorizedNamespaces(spaces) };
    }

    const privilege = this.authorization.actions.savedObject.get(ACTION_SAVED_OBJECT_TYPE, 'get');
    const checkPrivileges = this.authorization.checkPrivilegesWithRequest(this.request);
    const { privileges } = await checkPrivileges.atSpaces(spaces, {
      kibana: [privilege],
    });

    const authorizedSpaces = [
      ...new Set(
        privileges.kibana.flatMap((entry) =>
          entry.authorized && entry.privilege === privilege && entry.resource
            ? [entry.resource]
            : []
        )
      ),
    ];

    const unauthorizedSpaces = spaces.filter((spaceId) => !authorizedSpaces.includes(spaceId));
    if (unauthorizedSpaces.length > 0) {
      throw Boom.forbidden(
        `Unauthorized to get actions. Validate that you have permissions to access spaces: ${unauthorizedSpaces.join(
          ', '
        )}.`
      );
    }

    if (authorizedSpaces.length === 0) {
      throw Boom.forbidden('Unauthorized to get actions.');
    }

    return { filter: this.buildFilterForAuthorizedNamespaces(authorizedSpaces) };
  }

  private buildFilterForAuthorizedNamespaces(spaces?: string[]): KueryNode {
    if (!spaces || spaces.length === 0) {
      return fromKueryExpression('*');
    }

    return nodeBuilder.or(spaces.map((spaceId) => nodeBuilder.is('kibana.space_ids', spaceId)));
  }
}
