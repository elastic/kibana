/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObject, SavedObjectsClientContract } from 'src/core/server/';
import { SAVED_OBJECT_TYPE } from '../../common/constants';
import { AssetReference, AssetType, InstallationAttributes } from '../../common/types';
import * as Registry from '../registry';
import { CallESAsCurrentUser, assetUsesObjects, getInstallationObject } from './index';
import { getObjects } from './get_objects';

export async function installIntegration(options: {
  savedObjectsClient: SavedObjectsClientContract;
  pkgkey: string;
  asset: AssetType;
  callCluster: CallESAsCurrentUser;
}) {
  const { savedObjectsClient, pkgkey, asset, callCluster } = options;
  // install any assets (in ES, as Saved Objects, etc) as required. Get references to them
  const toSave = await installAssets({
    savedObjectsClient,
    pkgkey,
    asset,
    callCluster,
  });

  if (toSave.length) {
    // saved those references in the integration manager's state object
    const saved = await saveInstallationReferences({
      savedObjectsClient,
      pkgkey,
      toSave,
    });
    return saved;
  }

  return [];
}

// the function which how to install each of the various asset types
// TODO: make it an exhaustive list
// e.g. switch statement with cases for each enum key returning `never` for default case
export async function installAssets(options: {
  savedObjectsClient: SavedObjectsClientContract;
  pkgkey: string;
  asset: AssetType;
  callCluster: CallESAsCurrentUser;
}) {
  const { savedObjectsClient, pkgkey, asset, callCluster } = options;
  if (assetUsesObjects(asset)) {
    const references = await installObjects({ savedObjectsClient, pkgkey, asset });
    return references;
  }
  if (asset === 'ingest-pipeline') {
    const references = await installPipelines({ callCluster, pkgkey });
    return references;
  }

  return [];
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
  const results = await savedObjectsClient.create<InstallationAttributes>(
    SAVED_OBJECT_TYPE,
    { installed: toInstall },
    { id: pkgkey, overwrite: true }
  );

  return results;
}

async function installObjects({
  savedObjectsClient,
  pkgkey,
  asset,
}: {
  savedObjectsClient: SavedObjectsClientContract;
  pkgkey: string;
  asset: AssetType;
}) {
  const isSameType = ({ path }: Registry.ArchiveEntry) => asset === Registry.pathParts(path).type;
  const toBeSavedObjects = await getObjects(pkgkey, isSameType);
  const createResults = await savedObjectsClient.bulkCreate(toBeSavedObjects, { overwrite: true });
  const createdObjects = createResults.saved_objects;
  const installed = createdObjects.map(toAssetReference);

  return installed;
}

async function installPipelines({
  callCluster,
  pkgkey,
}: {
  callCluster: CallESAsCurrentUser;
  pkgkey: string;
}) {
  const isPipeline = ({ path }: Registry.ArchiveEntry) =>
    Registry.pathParts(path).type === 'ingest-pipeline';
  const paths = await Registry.getArchiveInfo(pkgkey, isPipeline);
  const installationPromises = paths.map(path => installPipeline({ callCluster, path }));
  const references = await Promise.all(installationPromises);

  return references;
}

async function installPipeline({
  callCluster,
  path,
}: {
  callCluster: CallESAsCurrentUser;
  path: string;
}): Promise<AssetReference> {
  const buffer = Registry.getAsset(path);
  // sample data is invalid json. strip the offending parts before parsing
  const json = buffer.toString('utf8').replace(/\\/g, '');
  const pipeline = JSON.parse(json);
  const { file, type } = Registry.pathParts(path);
  const id = file.replace('.json', '');
  // TODO: any sort of error, not "happy path", handling
  await callCluster('ingest.putPipeline', { id, body: pipeline });

  return { id, type };
}

function toAssetReference({ id, type }: SavedObject) {
  const reference: AssetReference = { id, type };

  return reference;
}
