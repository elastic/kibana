/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { getAclState, isRestricted } from '@kbn/access-control';
import type { CanonicalAcl } from '@kbn/access-control';

import { CONNECTOR_ACCESS_POLICY } from '../../../../../common/access_policy';
import type { ActionsClientContext } from '../../../../actions_client';
import { ACTION_SAVED_OBJECT_TYPE } from '../../../../constants/saved_objects';
import { MAX_ACTIONS_RETURNED } from '../../../../data/connector/constants';
import { ConnectorAuditAction, connectorAuditEvent } from '../../../../lib/audit_events';
import type { ConnectorAccessContext } from '../../../../lib/connector_access';
import { getConnectorAccessControl, getConnectorSpaceId } from '../../../../lib/connector_access';
import type { RawAction } from '../../../../types';
import { filterInferenceConnectors } from '../get_all';

export interface ResolveConnectorNameParams {
  context: ConnectorAccessContext &
    Pick<
      ActionsClientContext,
      | 'auditLogger'
      | 'authorization'
      | 'inMemoryConnectors'
      | 'internalSavedObjectsRepository'
      | 'scopedClusterClient'
    >;
  name: string;
}

interface Candidate {
  id: string;
  acl?: CanonicalAcl;
}

/**
 * Returns the ID of the connector with the given name in the request's space, or `undefined` when
 * there is none or the caller cannot view it. Every connector with that name counts when deciding
 * whether the name is ambiguous, so that error never depends on the caller's visibility.
 */
export const resolveConnectorName = async ({
  context,
  name,
}: ResolveConnectorNameParams): Promise<string | undefined> => {
  try {
    await context.authorization.ensureAuthorized({ operation: 'get' });
  } catch (error) {
    context.auditLogger?.log(connectorAuditEvent({ action: ConnectorAuditAction.FIND, error }));
    throw error;
  }

  // Saved connectors come before in-memory ones, as `getAll` lists connectors that share a name.
  const candidates = [
    ...(await findSavedConnectorsByName(context, name)),
    ...(await findInMemoryConnectorsByName(context, name)),
  ];
  if (candidates.length === 0) {
    return;
  }

  // With object-level security disabled, ACLs restrict nothing, so the first match is kept as before.
  const accessControl = getConnectorAccessControl(context);
  if (!accessControl) {
    return candidates[0].id;
  }

  // A restricted connector must never be picked silently from several, because whether the caller
  // can use it is decided only after the pick.
  const isAmbiguous =
    candidates.length > 1 &&
    candidates.some(
      ({ acl }) => isRestricted(CONNECTOR_ACCESS_POLICY, acl) || getAclState(acl) === 'invalid'
    );
  if (isAmbiguous) {
    throw Boom.badRequest(
      `Connector name "${name}" matches more than one connector; use the connector ID`
    );
  }

  // A connector the caller cannot view is reported as missing, so that its ID never leaks.
  // Unrestricted connectors are visible without any lookup.
  const [visibleCandidate] = await accessControl.filterVisible({
    type: ACTION_SAVED_OBJECT_TYPE,
    spaceId: getConnectorSpaceId(context),
    objects: [candidates[0]],
  });
  return visibleCandidate?.id;
};

const findSavedConnectorsByName = async (
  { internalSavedObjectsRepository, ...context }: ResolveConnectorNameParams['context'],
  name: string
): Promise<Candidate[]> => {
  if (!internalSavedObjectsRepository) {
    throw new Error('Connector names cannot be resolved without the internal repository');
  }

  // The phrase search narrows the read to connectors whose name contains the name's words; only
  // exact matches are candidates.
  // shortcut: a name without any word, such as "---", matches no connector this way.
  const { saved_objects: savedObjects } = await internalSavedObjectsRepository.find<RawAction>({
    type: ACTION_SAVED_OBJECT_TYPE,
    search: `"${name.replace(/[\\"]/g, '\\$&')}"`,
    searchFields: ['name'],
    fields: ['name'],
    namespaces: [getConnectorSpaceId(context)],
    perPage: MAX_ACTIONS_RETURNED,
  });
  return savedObjects
    .filter(({ attributes }) => attributes.name === name)
    .map(({ id, acl }) => ({ id, acl }));
};

const findInMemoryConnectorsByName = async (
  { inMemoryConnectors, scopedClusterClient }: ResolveConnectorNameParams['context'],
  name: string
): Promise<Candidate[]> => {
  const candidates = inMemoryConnectors.filter(
    (connector) => !connector.isSystemAction && connector.name === name
  );
  if (candidates.length === 0) {
    return [];
  }

  // Inference connectors without an endpoint are not listed by `getAll`, so they are not candidates.
  const listed = await filterInferenceConnectors(scopedClusterClient.asInternalUser, candidates);
  return listed.map(({ id }) => ({ id }));
};
