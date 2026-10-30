/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generalAccessPermits } from '@kbn/access-control';
import { SavedObjectsUtils, isSavedObjectErrorResult } from '@kbn/core/server';

import { CONNECTOR_ACCESS_POLICY } from '../../../../../common/access_policy';
import type { ActionsClientContext } from '../../../../actions_client';
import { ACTION_SAVED_OBJECT_TYPE } from '../../../../constants/saved_objects';
import { getConnectorAccessControl, getConnectorSpaceId } from '../../../../lib/connector_access';
import type { RawAction } from '../../../../types';

export interface GetRestrictedConnectorIdsParams {
  context: ActionsClientContext;
  ids: string[];
}

/**
 * Returns the stored connectors whose general access does not let everyone use them. Connectors
 * are read as the internal user, so a connector the caller cannot view is still classified.
 */
export const getRestrictedConnectorIds = async ({
  context,
  ids,
}: GetRestrictedConnectorIdsParams): Promise<string[]> => {
  const storedIds = [...new Set(ids)].filter(
    (id) => !context.inMemoryConnectors.some((connector) => connector.id === id)
  );
  if (storedIds.length === 0 || !getConnectorAccessControl(context)) {
    return [];
  }

  const { internalSavedObjectsRepository } = context;
  if (!internalSavedObjectsRepository) {
    throw new Error('Connector access cannot be classified without the internal repository');
  }

  const { saved_objects: connectors } = await internalSavedObjectsRepository.bulkGet<RawAction>(
    storedIds.map((id) => ({ type: ACTION_SAVED_OBJECT_TYPE, id })),
    { namespace: SavedObjectsUtils.namespaceStringToId(getConnectorSpaceId(context)) }
  );

  return connectors.flatMap((connector) => {
    if (isSavedObjectErrorResult(connector)) {
      // Only a connector that does not exist counts as unrestricted, so that operations that
      // tolerated a missing connector do not gain a new failure. Any other error fails closed.
      return connector.error.statusCode === 404 ? [] : [connector.id];
    }

    return generalAccessPermits(CONNECTOR_ACCESS_POLICY, connector.acl, 'use')
      ? []
      : [connector.id];
  });
};
