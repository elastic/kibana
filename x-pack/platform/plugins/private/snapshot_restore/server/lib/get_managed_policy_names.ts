/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

// Cloud has its own system for managing SLM policies and we want to make
// this clear when Snapshot and Restore is used in a Cloud deployment.
// Retrieve the Cloud-managed policies so that UI can switch
// logical paths based on this information.
export const getManagedPolicyNames = async (
  clusterClient: ElasticsearchClient
): Promise<string[]> => {
  try {
    const { persistent, transient, defaults } = await clusterClient.cluster.getSettings({
      filter_path: '*.*managed_policies',
      flat_settings: true,
      include_defaults: true,
    });

    const { 'cluster.metadata.managed_policies': managedPolicyNames = [] } = {
      ...defaults,
      ...persistent,
      ...transient,
    };
    return managedPolicyNames;
  } catch (e) {
    // Silently swallow error and return empty array for managed policy names
    // so that downstream calls are not blocked. In a healthy environment, we do
    // not expect to reach here.
    return [];
  }
};
