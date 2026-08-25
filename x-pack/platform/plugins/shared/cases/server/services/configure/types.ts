/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject, SavedObjectsClientContract } from '@kbn/core/server';
import type { ConfigurationAttributes } from '../../../common/types/domain';
import type { IndexRefresh } from '../types';
import type { SavedObjectFindOptionsKueryNode } from '../../common/types';

export interface ClientArgs {
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
}

export interface GetCaseConfigureArgs extends ClientArgs {
  configurationId: string;
}

export interface DeleteCaseConfigureArgs extends GetCaseConfigureArgs, IndexRefresh {}

export interface FindCaseConfigureArgs extends ClientArgs {
  options?: SavedObjectFindOptionsKueryNode;
}

export interface PostCaseConfigureArgs extends ClientArgs, IndexRefresh {
  attributes: ConfigurationAttributes;
  id: string;
}

export interface PatchCaseConfigureArgs extends ClientArgs, IndexRefresh {
  configurationId: string;
  updatedAttributes: Partial<ConfigurationAttributes>;
  originalConfiguration: SavedObject<ConfigurationAttributes>;
}
