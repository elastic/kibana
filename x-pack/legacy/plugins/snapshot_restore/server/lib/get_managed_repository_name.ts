/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const getManagedRepositoryName = async (
  callWithInternalUser: any
): Promise<string | undefined> => {
  try {
    const { persistent, transient, defaults } = await callWithInternalUser('cluster.getSettings', {
      filterPath: '*.*managed_repository',
      flatSettings: true,
      includeDefaults: true,
    });
    const { 'cluster.metadata.managed_repository': managedRepositoryName = undefined } = {
      ...defaults,
      ...persistent,
      ...transient,
    };
    return managedRepositoryName;
  } catch (e) {
    // Silently swallow error and return undefined
    return;
  }
};
