/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';

import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';

import { getSoClientInfo } from '../..';

import { isSpaceAwarenessEnabled } from '../spaces/helpers';

/**
 * Given a SO client this utility will return back the `namespace` that should be used when calling
 * certain soClient methods.
 * Mostly helpful when working with an internal un-scoped soClient, where it likely the
 * namespaces to be used should be `[*]`
 *
 * @param soClient
 * @param spaceId
 */
export const calculateSavedObjectsNamespaces = async (
  soClient: SavedObjectsClientContract,
  spaceId: string[] | string = []
): Promise<string[] | undefined> => {
  if (!(await isSpaceAwarenessEnabled())) {
    return undefined;
  }

  const soInfo = getSoClientInfo(soClient);
  const soClientNamespace = soClient.getCurrentNamespace();
  const spaceIds = Array.isArray(spaceId) ? spaceId : [spaceId];

  if (!soClientNamespace) {
    if (spaceIds.length > 0) {
      return spaceIds;
    }

    // Saved object client will always return `undefined` if the space it was initiated with is
    // `default`. If the SO client has information indicating that is the case, then return `undefined`,
    // thus allowing the client to operate on the `default` space
    if (soInfo?.spaceId === DEFAULT_SPACE_ID) {
      return undefined;
    }

    return ['*'];
  }

  // If the spaceId request is the same as the one that the SO Client is already scoped to,
  // then return undefined.
  if (spaceIds.length === 1 && spaceIds[0] === soClientNamespace) {
    return undefined;
  }

  return spaceIds.length > 0 ? spaceIds : undefined;
};
