/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { CoreAccessControlService, KibanaRequest } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { fromKueryExpression, nodeBuilder, type KueryNode } from '@kbn/es-query';
import type { SecurityPluginSetup } from '@kbn/security-plugin/server';
import {
  ACTION_SAVED_OBJECT_TYPE,
  ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE,
} from '../constants/saved_objects';

export interface ConstructorOptions {
  request: KibanaRequest;
  authorization?: SecurityPluginSetup['authz'];
  /** Object-level security. When enabled, recovery authority rides on every privilege check. */
  accessControl?: CoreAccessControlService;
}

/**
 * Privilege action that grants recovery authority over connectors, see platform object-level security.
 */
const RECOVERY_OPERATION = 'manage_access_control';

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
  private readonly accessControl?: CoreAccessControlService;

  constructor({ request, authorization, accessControl }: ConstructorOptions) {
    this.request = request;
    this.authorization = authorization;
    this.accessControl = accessControl;
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

      // Object-level security needs recovery authority only to decide between a forbidden operation and
      // a missing connector. It rides on this request so that it never costs another one, and it does
      // not affect whether the operation itself is authorized.
      const recoveryAction = this.accessControl?.isEnabled()
        ? authorization.actions.savedObject.get(ACTION_SAVED_OBJECT_TYPE, RECOVERY_OPERATION)
        : undefined;
      const response = await checkPrivileges({
        kibana: [
          ...privileges,
          ...additionalPrivileges,
          ...(recoveryAction ? [recoveryAction] : []),
        ],
      });

      let { hasAllRequested } = response;
      const recovery = recoveryAction
        ? response.privileges.kibana.find(({ privilege }) => privilege === recoveryAction)
        : undefined;
      if (recovery) {
        hasAllRequested = response.privileges.kibana.every(
          ({ privilege, authorized }) => privilege === recoveryAction || authorized
        );
        this.accessControl
          ?.asScoped(this.request)
          .primeRecovery(ACTION_SAVED_OBJECT_TYPE, [recovery.resource ?? '*'], recovery.authorized);
      }

      if (!hasAllRequested) {
        throw Boom.forbidden(
          `Unauthorized to ${operation} ${actionTypeId ? `a "${actionTypeId}" action` : `actions`}`
        );
      }
    }
  }

  public async getFindAuthorizationFilter({
    namespaces,
  }: {
    namespaces?: Array<string | undefined>;
  }): Promise<{ filter: KueryNode }> {
    const spaces =
      namespaces && namespaces.length > 0
        ? namespaces.map((space) => (space === undefined ? DEFAULT_SPACE_ID : space))
        : [this.request.spaceId ?? DEFAULT_SPACE_ID];

    if (!this.authorization?.mode?.useRbacForRequest(this.request)) {
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
