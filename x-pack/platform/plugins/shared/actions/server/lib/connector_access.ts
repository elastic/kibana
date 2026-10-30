/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import type { CanonicalAcl } from '@kbn/access-control';
import type { KibanaRequest, SecurityServiceStart } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { SpacesServiceStart } from '@kbn/spaces-plugin/server';

import type { AuthMode } from '@kbn/connector-specs';
import { ACTION_SAVED_OBJECT_TYPE } from '../constants/saved_objects';

/**
 * Connector operations that object-level security decides beyond viewing, which the Saved Objects
 * repository already enforces on every connector read.
 */
export type ConnectorOperation = 'use' | 'edit' | 'delete';

export interface ConnectorAccessContext {
  request: KibanaRequest;
  securityService?: Pick<SecurityServiceStart, 'accessControl'>;
  /** Space the connector lives in, when it is not the request's space. */
  spaceId?: string;
  spaces?: Pick<SpacesServiceStart, 'getSpaceId'>;
}

export const getConnectorSpaceId = ({ spaceId, spaces, request }: ConnectorAccessContext) =>
  spaceId ?? spaces?.getSpaceId(request) ?? DEFAULT_SPACE_ID;

/**
 * Returns the request's object-level security service, or `undefined` when object-level security
 * is disabled and connectors keep their behavior from before it.
 */
export const getConnectorAccessControl = (context: ConnectorAccessContext) => {
  const accessControl = context.securityService?.accessControl.asScoped(context.request);
  return accessControl?.isEnabled() ? accessControl : undefined;
};

/**
 * Throws unless the caller can perform the operation on a stored connector. A connector the caller
 * cannot view is reported as missing. Connectors whose general access permits the operation pass
 * without any lookup, so unrestricted connectors keep today's cost.
 *
 * Call it before the first side effect of the operation.
 */
export const ensureConnectorOperation = async (
  context: ConnectorAccessContext,
  { id, acl, operation }: { id: string; acl?: CanonicalAcl; operation: ConnectorOperation }
) => ensureConnectorsOperation(context, { connectors: [{ id, acl }], operation });

/**
 * Throws unless the caller can perform the operation on every stored connector, with one decision
 * for all of them. Errors are the same as for {@link ensureConnectorOperation}.
 */
export const ensureConnectorsOperation = async (
  context: ConnectorAccessContext,
  {
    connectors,
    operation,
  }: { connectors: Array<{ id: string; acl?: CanonicalAcl }>; operation: ConnectorOperation }
) => {
  const accessControl = getConnectorAccessControl(context);
  if (!accessControl || connectors.length === 0) {
    return;
  }

  const decisions = await accessControl.authorize({
    type: ACTION_SAVED_OBJECT_TYPE,
    spaceId: getConnectorSpaceId(context),
    operation,
    objects: connectors,
  });
  for (const { id } of connectors) {
    const decision = decisions.get(id);
    if (decision?.status === 'not_found') {
      throw SavedObjectsErrorHelpers.createGenericNotFoundError(ACTION_SAVED_OBJECT_TYPE, id);
    }
    if (decision?.status === 'forbidden') {
      throw Boom.forbidden(`Unable to ${operation} connector: missing "${operation}" permission`);
    }
  }
};

/**
 * Returns the operation an OAuth flow needs. A per-user flow acts for the caller only, so running
 * the connector is enough; a shared flow changes credentials everyone uses, so it needs edit.
 */
export const operationForAuthMode = (authMode?: AuthMode): ConnectorOperation =>
  authMode === 'per-user' ? 'use' : 'edit';
