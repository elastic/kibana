/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ManagementAppLocator } from '@kbn/management-plugin/common';
import { LocatorDefinition } from '@kbn/share-plugin/public';
import { IndexManagementLocatorParams } from '@kbn/index-management-shared-types';
import {
  getComponentTemplateDetailLink,
  getDataStreamDetailsLink,
  getTemplateDetailsLink,
} from './application/services/routing';
import { PLUGIN } from '../common/constants';

export const INDEX_MANAGEMENT_LOCATOR_ID = 'INDEX_MANAGEMENT_LOCATOR_ID';

export interface IndexManagementLocatorDefinitionDependencies {
  managementAppLocator: ManagementAppLocator;
}

export class IndexManagementLocatorDefinition
  implements LocatorDefinition<IndexManagementLocatorParams>
{
  constructor(protected readonly deps: IndexManagementLocatorDefinitionDependencies) {}

  public readonly id = INDEX_MANAGEMENT_LOCATOR_ID;

  public readonly getLocation = async (params: IndexManagementLocatorParams) => {
    const location = await this.deps.managementAppLocator.getLocation({
      sectionId: 'data',
      appId: PLUGIN.ID,
    });

    switch (params.page) {
      case 'data_streams_details': {
        return {
          ...location,
          path: location.path + getDataStreamDetailsLink(params.dataStreamName!),
        };
      }
      case 'index_template': {
        return {
          ...location,
          path: location.path + getTemplateDetailsLink(params.indexTemplate),
        };
      }
      case 'component_template': {
        return {
          ...location,
          path: location.path + getComponentTemplateDetailLink(params.componentTemplate),
        };
      }
    }
  };
}
