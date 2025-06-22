/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';

export const fetchIndexPrivileges = async (
  client: IScopedClusterClient,
  indexAndAliasNames: string[]
) => {
  // TODO: make multiple batched requests if indicesNames.length > SOMETHING
  const { index: indexPrivileges } = await client.asCurrentUser.security.hasPrivileges({
    index: [
      {
        names: indexAndAliasNames,
        privileges: ['read', 'manage'],
      },
    ],
  });
  return indexPrivileges;
};
