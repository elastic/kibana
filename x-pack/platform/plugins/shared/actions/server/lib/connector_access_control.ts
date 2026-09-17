/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { SavedObjectAccessControl } from '@kbn/core/server';
import { hasSavedObjectAccess, isAccessRestricted } from '@kbn/core-saved-objects-utils-server';
import type { AccessControlInput } from '@kbn/entity-access-control';
import { InvalidAccessControlError } from '@kbn/entity-access-control';
import { CONNECTOR_ACCESS_ROLES } from '../../common/access_control';
import type {
  ConnectorAccessPermissions,
  ConnectorAccessResponse,
  ConnectorAccessRole,
} from '../../common/access_control';
import { ACTION_SAVED_OBJECT_TYPE } from '../constants/saved_objects';
import type { ActionsClientContext } from '../actions_client';
import type { RawAction } from '../types';

export type ConnectorAccessOperation = keyof ConnectorAccessPermissions;

type AccessContext = Pick<
  ActionsClientContext,
  'request' | 'getCurrentUserProfileId' | 'unsecuredSavedObjectsClient'
> & { authorization: Pick<ActionsClientContext['authorization'], 'ensureAuthorized'> };

/**
 * Resolves what the given user profile may do with a connector. Space and connector feature
 * privileges are enforced separately by `ActionsAuthorization`; access control only subtracts.
 */
export const getConnectorPermissions = (
  accessControl: SavedObjectAccessControl | undefined,
  profileId?: string
): ConnectorAccessPermissions => {
  const isOwner = !!profileId && accessControl?.owner === profileId;
  const isRestricted = isAccessRestricted(accessControl);
  const read = hasSavedObjectAccess({
    accessControl,
    profileUid: profileId,
    roles: CONNECTOR_ACCESS_ROLES,
  });

  return {
    read,
    execute: read,
    edit: !isRestricted || isOwner,
    // The first user to restrict a connector becomes its owner, so connectors created before the
    // type opted in to access control can still be restricted.
    manage: !!profileId && (!accessControl?.owner || isOwner),
  };
};

export const assertConnectorAccess = (
  accessControl: SavedObjectAccessControl | undefined,
  profileId: string | undefined,
  operation: ConnectorAccessOperation,
  id: string
): void => {
  const permissions = getConnectorPermissions(accessControl, profileId);
  if (permissions[operation]) {
    return;
  }

  // A user that cannot see the connector at all gets a not-found for every operation, so that a
  // restricted connector is not discoverable. Users that can see it get a forbidden instead.
  throw permissions.read
    ? Boom.forbidden(`Unauthorized to ${operation} connector ${id}`)
    : Boom.notFound(`Connector ${id} not found`);
};

/** Enforces the access control of a connector for the user behind the current request. */
export const ensureConnectorAccess = async (
  context: AccessContext,
  { id, accessControl }: { id: string; accessControl?: SavedObjectAccessControl },
  operation: ConnectorAccessOperation
): Promise<void> => {
  if (!isAccessRestricted(accessControl)) {
    return;
  }

  assertConnectorAccess(
    accessControl,
    await context.getCurrentUserProfileId?.(context.request),
    operation,
    id
  );
};

/** Filters out the connectors the user behind the current request cannot see. */
export const filterAccessibleConnectors = async <
  T extends { id: string; accessControl?: SavedObjectAccessControl }
>(
  context: Pick<AccessContext, 'request' | 'getCurrentUserProfileId'>,
  connectors: T[]
): Promise<T[]> => {
  if (!connectors.some(({ accessControl }) => isAccessRestricted(accessControl))) {
    return connectors;
  }

  const profileId = await context.getCurrentUserProfileId?.(context.request);
  return connectors.filter(
    ({ accessControl }) => getConnectorPermissions(accessControl, profileId).read
  );
};

export const getConnectorAccessControl = async (
  context: AccessContext,
  id: string
): Promise<ConnectorAccessResponse> => {
  await context.authorization.ensureAuthorized({ operation: 'get' });

  const { accessControl } = await context.unsecuredSavedObjectsClient.get<RawAction>(
    ACTION_SAVED_OBJECT_TYPE,
    id
  );
  const profileId = await context.getCurrentUserProfileId?.(context.request);
  assertConnectorAccess(accessControl, profileId, 'read', id);

  const permissions = getConnectorPermissions(accessControl, profileId);
  if (!permissions.manage) {
    return { permissions };
  }

  return {
    permissions,
    ...(accessControl?.owner && { owner: accessControl.owner }),
    access_control: {
      access_mode: isAccessRestricted(accessControl) ? 'private' : 'public',
      entries: (accessControl?.entries ?? []).map(({ type, id: uid, added_at: addedAt }) => ({
        type,
        id: uid,
        role: 'executor' as const,
        added_at: addedAt,
      })),
    },
  };
};

export const updateConnectorAccessControl = async (
  context: AccessContext,
  id: string,
  input: AccessControlInput<ConnectorAccessRole>,
  validateRecipients: (profileIds: Set<string>) => Promise<void>
): Promise<void> => {
  await context.authorization.ensureAuthorized({ operation: 'update' });

  const { accessControl } = await context.unsecuredSavedObjectsClient.get<RawAction>(
    ACTION_SAVED_OBJECT_TYPE,
    id
  );
  const profileId = await context.getCurrentUserProfileId?.(context.request);
  if (!profileId) {
    throw Boom.forbidden('A user profile is required to manage connector access');
  }
  assertConnectorAccess(accessControl, profileId, 'manage', id);

  const isPrivate = input.access_mode === 'private';
  const entries = isPrivate ? input.entries ?? [] : [];

  const currentRecipients = new Set((accessControl?.entries ?? []).map(({ id: uid }) => uid));
  const newRecipients = new Set(
    entries
      .map(({ id: uid }) => uid)
      .filter((uid) => uid !== profileId && !currentRecipients.has(uid))
  );
  if (newRecipients.size) {
    await validateRecipients(newRecipients);
  }

  const { objects } = await context.unsecuredSavedObjectsClient.changeAccessControl(
    [{ type: ACTION_SAVED_OBJECT_TYPE, id }],
    {
      accessMode: isPrivate ? 'private' : 'default',
      entries: entries.map(({ type, id: uid, role }) => ({ type, id: uid, role })),
      roles: CONNECTOR_ACCESS_ROLES,
      owner: accessControl?.owner ?? profileId,
    }
  );

  const [{ error }] = objects;
  if (error) {
    throw error.statusCode === 400
      ? new InvalidAccessControlError(error.message)
      : Boom.boomify(new Error(error.message), { statusCode: error.statusCode });
  }
};
