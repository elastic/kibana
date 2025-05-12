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
 */
export const getNamespaceForSoClient = async (
  soClient: SavedObjectsClientContract
): Promise<string> => {
  if (!(await isSpaceAwarenessEnabled())) {
    return '';
  }

  const soClientNamespace = soClient.getCurrentNamespace();

  // Internal un-scoped soClient do not have a namespace set - in these cases we set the namespace to `*`
  // so that searches are done across all spaces.
  if (!soClientNamespace) {
    return '*';
  }

  return soClientNamespace;
};
