/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ManagementAppLocator } from '@kbn/management-plugin/common';
import type { LocatorDefinition } from '@kbn/share-plugin/public';
import {
  INDEX_MANAGEMENT_LOCATOR_ID,
  type IndexManagementLocatorParams,
} from '@kbn/index-management-shared-types';
import {
  getComponentTemplateCloneLink,
  getComponentTemplateCreateLink,
  getComponentTemplateDetailLink,
  getComponentTemplateEditLink,
  getComponentTemplateListLink,
  getDataStreamDetailsLink,
  getIndexListUri,
  getTemplateCreateLink,
  getTemplateCloneLink,
  getTemplateDetailsLink,
  getTemplateEditLink,
} from './application/services/routing';
import { PLUGIN } from '../common/constants';
export { INDEX_MANAGEMENT_LOCATOR_ID };

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
      case 'index_list': {
        return {
          ...location,
          path: location.path + getIndexListUri(params.filter, params.includeHiddenIndices),
        };
      }
      case 'data_stream_index_list': {
        return {
          ...location,
          path: location.path + getIndexListUri(`data_stream="${params.dataStreamName}"`, true),
        };
      }
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
      case 'index_template_edit': {
        return {
          ...location,
          path: location.path + getTemplateEditLink(params.indexTemplate, false),
        };
      }
      case 'index_template_clone': {
        return {
          ...location,
          path: location.path + getTemplateCloneLink(params.indexTemplate),
        };
      }
      case 'create_template': {
        return {
          ...location,
          path: location.path + getTemplateCreateLink(),
        };
      }
      case 'component_template': {
        return {
          ...location,
          path: location.path + getComponentTemplateDetailLink(params.componentTemplate),
        };
      }
      case 'component_template_list': {
        return {
          ...location,
          path: location.path + getComponentTemplateListLink(params.filter),
        };
      }
      case 'edit_component_template': {
        return {
          ...location,
          path: location.path + getComponentTemplateEditLink(params.componentTemplate),
        };
      }
      case 'clone_component_template': {
        return {
          ...location,
          path: location.path + getComponentTemplateCloneLink(params.componentTemplate),
        };
      }
      case 'create_component_template': {
        return {
          ...location,
          path: location.path + getComponentTemplateCreateLink(params.componentTemplate),
        };
      }
    }
  };
}
