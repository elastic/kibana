/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObject, SavedObjectsClientContract } from 'src/core/server/';
import { SAVED_OBJECT_TYPE } from '../../common/constants';
import {
  AssetReference,
  ElasticsearchAssetType,
  InstallationAttributes,
  KibanaAssetType,
} from '../../common/types';
import * as Registry from '../registry';
import { CallESAsCurrentUser, getInstallationObject } from './index';
import { getObjects } from './get_objects';

export async function installPackage(options: {
  savedObjectsClient: SavedObjectsClientContract;
  pkgkey: string;
}): Promise<AssetReference[]> {
  const { savedObjectsClient, pkgkey } = options;

  const toSave = await installAssets({
    savedObjectsClient,
    pkgkey,
  });

  // Save those references in the package manager's state saved object
  return saveInstallationReferences({
    savedObjectsClient,
    pkgkey,
    toSave,
  });
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

const isDirectory = ({ path }: Registry.ArchiveEntry) => path.endsWith('/');
const isPipeline = ({ path }: Registry.ArchiveEntry) =>
  !isDirectory({ path }) && Registry.pathParts(path).type === ElasticsearchAssetType.ingestPipeline;

// *Not really a datasource* but it'll do for now
export async function installDatasource(options: {
  savedObjectsClient: SavedObjectsClientContract;
  pkgkey: string;
  callCluster: CallESAsCurrentUser;
}) {
  const { savedObjectsClient, pkgkey, callCluster } = options;
  const toSave = await installPipelines({ pkgkey, callCluster });

  // currently saving to the EPM state Saved Object
  // /api/ingest/datasource/add (or whatever) will use separate Saved Object
  return saveInstallationReferences({
    savedObjectsClient,
    pkgkey,
    toSave,
  });
}

async function installPipelines({
  callCluster,
  pkgkey,
}: {
  callCluster: CallESAsCurrentUser;
  pkgkey: string;
}) {
  const paths = await Registry.getArchiveInfo(pkgkey, isPipeline);
  const installationPromises = paths.map(path => installPipeline({ callCluster, path }));

  return Promise.all(installationPromises);
}

async function installPipeline({
  callCluster,
  path,
}: {
  callCluster: CallESAsCurrentUser;
  path: string;
}): Promise<AssetReference> {
  const buffer = Registry.getAsset(path);
  const parts = Registry.pathParts(path);
  const id = path.replace(/\W/g, '_'); // TODO: replace with "real" pipeline id
  const pipeline = buffer.toString('utf8');

  await callCluster('ingest.putPipeline', { id, body: pipeline });

  return { id, type: parts.type };
}
