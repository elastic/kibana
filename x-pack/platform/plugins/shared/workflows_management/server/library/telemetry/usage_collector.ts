/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StartServicesAccessor } from '@kbn/core/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { WORKFLOWS_LIBRARY_ENABLED_SETTING_ID } from '@kbn/workflows';

import type { WorkflowsManagementConfig } from '../../config';
import { DEFAULT_LIBRARY_REGISTRY_URL } from '../library_fetcher';

export type LibraryCatalogSource = 'default_registry' | 'custom_registry' | 'bundle';

export interface LibraryUsage {
  enabled: boolean;
  source: LibraryCatalogSource;
}

/** Where the catalog is read from, without the registry URL or bundle path themselves. */
export const getLibraryCatalogSource = ({
  registryUrl,
  bundlePath,
}: WorkflowsManagementConfig['library']): LibraryCatalogSource => {
  if (bundlePath !== undefined) return 'bundle';
  if (registryUrl === undefined) return 'default_registry';
  return registryUrl.replace(/\/+$/, '') === DEFAULT_LIBRARY_REGISTRY_URL
    ? 'default_registry'
    : 'custom_registry';
};

export const registerLibraryUsageCollector = ({
  usageCollection,
  libraryConfig,
  getStartServices,
}: {
  usageCollection: UsageCollectionSetup;
  libraryConfig: WorkflowsManagementConfig['library'];
  getStartServices: StartServicesAccessor;
}): void => {
  const collector = usageCollection.makeUsageCollector<LibraryUsage>({
    type: 'workflows_library',
    isReady: () => true,
    schema: {
      enabled: {
        type: 'boolean',
        _meta: {
          description: 'Whether the workflowsManagement:library:enabled setting is on',
        },
      },
      source: {
        type: 'keyword',
        _meta: {
          description:
            'Where the Workflow Template library reads its catalog: default_registry, custom_registry or bundle',
        },
      },
    },
    fetch: async ({ soClient }) => {
      const [{ uiSettings }] = await getStartServices();
      const enabled = await uiSettings
        .globalAsScopedToClient(soClient)
        .get<boolean>(WORKFLOWS_LIBRARY_ENABLED_SETTING_ID);
      return { enabled, source: getLibraryCatalogSource(libraryConfig) };
    },
  });
  usageCollection.registerCollector(collector);
};
