/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SerializableRecord } from '@kbn/utility-types';
import { ManagementAppLocator } from '@kbn/management-plugin/common';
import { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/public';
import { PLUGIN } from '../common/constants';

export const LICENSE_MANAGEMENT_LOCATOR_ID = 'LICENSE_MANAGEMENT_LOCATOR';
export const UPLOAD_LICENSE_ROUTE = 'upload_license';

export interface LicenseManagementLocatorParams extends SerializableRecord {
  page: 'dashboard' | 'upload_license';
}

export type LicenseManagementLocator = LocatorPublic<LicenseManagementLocatorParams>;

export interface LicenseManagementLocatorDefinitionDependencies {
  managementAppLocator: ManagementAppLocator;
}

export class LicenseManagementLocatorDefinition
  implements LocatorDefinition<LicenseManagementLocatorParams>
{
  constructor(protected readonly deps: LicenseManagementLocatorDefinitionDependencies) {}

  public readonly id = LICENSE_MANAGEMENT_LOCATOR_ID;

  public readonly getLocation = async (params: LicenseManagementLocatorParams) => {
    const location = await this.deps.managementAppLocator.getLocation({
      sectionId: 'stack',
      appId: PLUGIN.id,
    });

    switch (params.page) {
      case 'upload_license': {
        return {
          ...location,
          path: `${location.path}/${UPLOAD_LICENSE_ROUTE}`,
        };
      }
      case 'dashboard': {
        return location;
      }
    }
  };
}
