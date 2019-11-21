/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObject, SavedObjectsClientContract } from 'src/core/server/';
import { SAVED_OBJECT_TYPE } from '../../common/constants';
import { KibanaAssetType } from '../../common/types';
import { AssetReference, InstallationAttributes } from '../types';
import * as Registry from '../registry';
import { getInstallationObject } from './index';
import { getObjects } from './get_objects';

export async function installPackage(options: {
  savedObjectsClient: SavedObjectsClientContract;
  pkgkey: string;
}): Promise<AssetReference[] | []> {
  const { savedObjectsClient, pkgkey } = options;

  const toSave = await installAssets({
    savedObjectsClient,
    pkgkey,
  });

  if (toSave.length) {
    // Save those references in the package manager's state saved object
    return saveInstallationReferences({
      savedObjectsClient,
      pkgkey,
      toSave,
    });
  }

  return [];
}

// the function which how to install each of the various asset types
// TODO: make it an exhaustive list
// e.g. switch statement with cases for each enum key returning `never` for default case
export async function installAssets(options: {
  savedObjectsClient: SavedObjectsClientContract;
  pkgkey: string;
}) {
  const { savedObjectsClient, pkgkey } = options;

  // Only install certain Kibana assets during package installation.
  // All other asset types need special handling
  const typesToInstall = Object.values(KibanaAssetType);
  const installationPromises = typesToInstall.map(async assetType =>
    installKibanaSavedObjects({ savedObjectsClient, pkgkey, assetType })
  );

  // installKibanaSavedObjects returns AssetReference[], so .map creates AssetReference[][]
  // call .flat to flatten into one dimensional array
  return Promise.all(installationPromises).then(results => results.flat());
}

export async function saveInstallationReferences(options: {
  savedObjectsClient: SavedObjectsClientContract;
  pkgkey: string;
  toSave: AssetReference[];
}) {
  const { savedObjectsClient, pkgkey, toSave } = options;
  const savedObject = await getInstallationObject({ savedObjectsClient, pkgkey });
  const savedRefs = savedObject && savedObject.attributes.installed;
  const mergeRefsReducer = (current: AssetReference[], pending: AssetReference) => {
    const hasRef = current.find(c => c.id === pending.id && c.type === pending.type);
    if (!hasRef) current.push(pending);
    return current;
  };

  const toInstall = toSave.reduce(mergeRefsReducer, savedRefs || []);

  await savedObjectsClient.create<InstallationAttributes>(
    SAVED_OBJECT_TYPE,
    { installed: toInstall },
    { id: pkgkey, overwrite: true }
  );

  return toInstall;
}

async function installKibanaSavedObjects({
  savedObjectsClient,
  pkgkey,
  assetType,
}: {
  savedObjectsClient: SavedObjectsClientContract;
  pkgkey: string;
  assetType: KibanaAssetType;
}) {
  const isSameType = ({ path }: Registry.ArchiveEntry) =>
    assetType === Registry.pathParts(path).type;

  const toBeSavedObjects = await getObjects(pkgkey, isSameType);
  if (toBeSavedObjects.length === 0) {
    return [];
  } else {
    const createResults = await savedObjectsClient.bulkCreate(toBeSavedObjects, {
      overwrite: true,
    });
    const createdObjects = createResults.saved_objects;
    const installed = createdObjects.map(toAssetReference);
    return installed;
  }
}

function toAssetReference({ id, type }: SavedObject) {
  const reference: AssetReference = { id, type };

  return reference;
}
