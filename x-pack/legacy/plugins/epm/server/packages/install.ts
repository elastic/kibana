/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObject, SavedObjectsClientContract } from 'src/core/server/';
import { SAVED_OBJECT_TYPE_PACKAGES } from '../../common/constants';
import { AssetReference, Installation, KibanaAssetType } from '../../common/types';
import { installIndexPatterns } from '../lib/kibana/index_pattern/install';
import * as Registry from '../registry';
import { getObject } from './get_objects';
import { getInstallation } from './index';

export async function installPackage(options: {
  savedObjectsClient: SavedObjectsClientContract;
  pkgkey: string;
}): Promise<AssetReference[]> {
  const { savedObjectsClient, pkgkey } = options;

  const toSave = await installAssets({
    savedObjectsClient,
    pkgkey,
  });

  // Setup basic index patterns
  // TODO: This should be updated and not overwritten in the future
  await installIndexPatterns(pkgkey, savedObjectsClient);

  // Save those references in the package manager's state saved object
  await saveInstallationReferences({
    savedObjectsClient,
    pkgkey,
    toSave,
  });

  return toSave;
}

// the function which how to install each of the various asset types
// TODO: make it an exhaustive list
// e.g. switch statement with cases for each enum key returning `never` for default case
export async function installAssets(options: {
  savedObjectsClient: SavedObjectsClientContract;
  pkgkey: string;
}) {
  const { savedObjectsClient, pkgkey } = options;

  // Only install Kibana assets during package installation.
  const kibanaAssetTypes = Object.values(KibanaAssetType);
  const installationPromises = kibanaAssetTypes.map(async assetType =>
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
  const installation = await getInstallation({ savedObjectsClient, pkgkey });
  const savedRefs = installation?.installed || [];
  const mergeRefsReducer = (current: AssetReference[], pending: AssetReference) => {
    const hasRef = current.find(c => c.id === pending.id && c.type === pending.type);
    if (!hasRef) current.push(pending);
    return current;
  };

  const toInstall = toSave.reduce(mergeRefsReducer, savedRefs);

  await savedObjectsClient.create<Installation>(
    SAVED_OBJECT_TYPE_PACKAGES,
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
  const paths = await Registry.getArchiveInfo(pkgkey, isSameType);
  const toBeSavedObjects = await Promise.all(paths.map(getObject));

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
