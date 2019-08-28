/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// Cloud has its own system for managing templates and we want to make
// this clear in the UI when a template is used in a Cloud deployment.
export const getManagedTemplatePrefix = async (
  callWithInternalUser: any
): Promise<string | undefined> => {
  try {
    const { persistent, transient, defaults } = await callWithInternalUser('cluster.getSettings', {
      filterPath: '*.*managed_index_templates',
      flatSettings: true,
      includeDefaults: true,
    });

    const { 'cluster.metadata.managed_index_templates': managedTemplatesPrefix = undefined } = {
      ...defaults,
      ...persistent,
      ...transient,
    };
    return managedTemplatesPrefix;
  } catch (e) {
    // Silently swallow error and return undefined for the prefix
    // so that downstream calls are not blocked.
    return;
  }
};
