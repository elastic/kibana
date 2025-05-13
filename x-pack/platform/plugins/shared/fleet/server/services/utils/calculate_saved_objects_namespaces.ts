/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';

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

  const soClientNamespace = soClient.getCurrentNamespace();
  const spaceIds = Array.isArray(spaceId) ? spaceId : [spaceId];

  if (!soClientNamespace) {
    if (spaceIds.length > 0) {
      return spaceIds;
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
