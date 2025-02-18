/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SavedObjectsClient,
  SavedObjectsErrorHelpers,
  SavedObjectsUpdateOptions,
} from '@kbn/core/server';
import { omit, pick } from 'lodash';
import { AdHocRunSO } from '../../data/ad_hoc_run/types';
import {
  AdHocRunAttributesNotPartiallyUpdatable,
  AdHocRunAttributesToEncrypt,
  AdHocRunAttributesIncludedInAAD,
  AD_HOC_RUN_SAVED_OBJECT_TYPE,
} from '../../saved_objects';

export type PartiallyUpdateableAdHocRunAttributes = Partial<
  Omit<AdHocRunSO, AdHocRunAttributesNotPartiallyUpdatable>
>;

interface PartiallyUpdateAdHocRunSavedObjectOptions {
  refresh?: SavedObjectsUpdateOptions['refresh'];
  version?: string;
  ignore404?: boolean;
  namespace?: string; // only should be used  with ISavedObjectsRepository
}

// typed this way so we can send a SavedObjectClient or SavedObjectRepository
type SavedObjectClientForUpdate = Pick<SavedObjectsClient, 'update'>;

export async function partiallyUpdateAdHocRun(
  savedObjectsClient: SavedObjectClientForUpdate,
  id: string,
  attributes: PartiallyUpdateableAdHocRunAttributes,
  options: PartiallyUpdateAdHocRunSavedObjectOptions = {}
): Promise<void> {
  // ensure we only have the valid attributes that are not encrypted and are excluded from AAD
  const attributeUpdates = omit(attributes, [
    ...AdHocRunAttributesToEncrypt,
    ...AdHocRunAttributesIncludedInAAD,
  ]);
  const updateOptions: SavedObjectsUpdateOptions<AdHocRunSO> = pick(
    options,
    'namespace',
    'version',
    'refresh'
  );

  try {
    await savedObjectsClient.update<AdHocRunSO>(
      AD_HOC_RUN_SAVED_OBJECT_TYPE,
      id,
      attributeUpdates,
      updateOptions
    );
  } catch (err) {
    if (options?.ignore404 && SavedObjectsErrorHelpers.isNotFoundError(err)) {
      return;
    }
    throw err;
  }
}
