/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsTaggingApiUiComponent } from '@kbn/saved-objects-tagging-oss-plugin/public';
import { TagsCapabilities } from '../../common';
import { ITagInternalClient, ITagsCache } from '../services';
import {
  getConnectedTagListComponent,
  getConnectedTagSelectorComponent,
  getConnectedSavedObjectModalTagSelectorComponent,
} from '../components/connected';
import { getCreateModalOpener } from '../components/edition_modal';
import { StartServices } from '../types';

export interface GetComponentsOptions extends StartServices {
  capabilities: TagsCapabilities;
  cache: ITagsCache;
  tagClient: ITagInternalClient;
}

export const getComponents = ({
  capabilities,
  cache,
  tagClient,
  ...startServices
}: GetComponentsOptions): SavedObjectsTaggingApiUiComponent => {
  const openCreateModal = getCreateModalOpener({ ...startServices, tagClient });
  return {
    TagList: getConnectedTagListComponent({ cache }),
    TagSelector: getConnectedTagSelectorComponent({ cache, capabilities, openCreateModal }),
    SavedObjectSaveModalTagSelector: getConnectedSavedObjectModalTagSelectorComponent({
      cache,
      capabilities,
      openCreateModal,
    }),
  };
};
