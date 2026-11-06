/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SerializableRecord } from '@kbn/utility-types';
import type { ManagementAppLocator } from '@kbn/management-plugin/common';
import type { LocatorDefinition } from '@kbn/share-plugin/public';
import { linkToPolicy, linkToRepository, linkToSnapshots } from './application/services/navigation';
import { PLUGIN, SNAPSHOT_RESTORE_LOCATOR_ID } from '../common/constants';

export { SNAPSHOT_RESTORE_LOCATOR_ID };

export type SnapshotRestoreLocatorParams = SerializableRecord &
  (
    | { page: 'snapshots' }
    | { page: 'repository'; repositoryName: string }
    | { page: 'policy'; policyName: string }
  );

export interface SnapshotRestoreLocatorDefinitionDependencies {
  managementAppLocator: ManagementAppLocator;
}

export class SnapshotRestoreLocatorDefinition
  implements LocatorDefinition<SnapshotRestoreLocatorParams>
{
  constructor(protected readonly deps: SnapshotRestoreLocatorDefinitionDependencies) {}

  public readonly id = SNAPSHOT_RESTORE_LOCATOR_ID;

  public readonly getLocation = async (params: SnapshotRestoreLocatorParams) => {
    const location = await this.deps.managementAppLocator.getLocation({
      sectionId: 'data',
      appId: PLUGIN.id,
    });

    switch (params.page) {
      case 'snapshots': {
        return {
          ...location,
          path: location.path + linkToSnapshots(),
        };
      }
      case 'repository': {
        return {
          ...location,
          path: location.path + linkToRepository(params.repositoryName),
        };
      }
      case 'policy': {
        return {
          ...location,
          path: location.path + linkToPolicy(params.policyName),
        };
      }
    }
  };
}
