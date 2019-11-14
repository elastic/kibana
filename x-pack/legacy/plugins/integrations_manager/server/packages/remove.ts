/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'src/core/server/';
import { SAVED_OBJECT_TYPE } from '../../common/constants';
import {
  getInstallationObject,
  assetUsesObjects,
  CallESAsCurrentUser,
  getPackageInfo,
} from './index';
import { AssetType } from '../../common/types';

export async function removeInstallation(options: {
  savedObjectsClient: SavedObjectsClientContract;
  pkgkey: string;
  callCluster: CallESAsCurrentUser;
}) {
  const { savedObjectsClient, pkgkey, callCluster } = options;
  const installation = await getInstallationObject({ savedObjectsClient, pkgkey });
  const installedObjects = (installation && installation.attributes.installed) || [];

  // Delete the manager saved object with references to the asset objects
  // could also update with [] or some other state
  await savedObjectsClient.delete(SAVED_OBJECT_TYPE, pkgkey);

  // Delete the installed assets
  const deletePromises = installedObjects.map(async ({ id, type }) => {
    const assetType = type as AssetType;
    if (assetUsesObjects(assetType)) {
      savedObjectsClient.delete(assetType, id);
    } else if (assetType === 'ingest-pipeline') {
      deletePipeline(callCluster, id);
    }
  });
  await Promise.all(deletePromises);

  // successful delete's in SO client return {}. return something more useful
  const packageInfo = await getPackageInfo({ savedObjectsClient, pkgkey });

  return packageInfo;
}

async function deletePipeline(callCluster: CallESAsCurrentUser, id: string): Promise<void> {
  // '*' shouldn't ever appear here, but it still would delete all ingest pipelines
  if (id && id !== '*') {
    await callCluster('ingest.deletePipeline', { id });
  }
}
