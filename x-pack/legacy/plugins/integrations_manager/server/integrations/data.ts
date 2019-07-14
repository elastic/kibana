/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract, ScopedClusterClient } from 'src/core/server/';
import { SAVED_OBJECT_TYPE, AssetTypes, InstallationStatus } from '../../common/constants';
import {
  AssetReference,
  Installable,
  Installation,
  InstallationAttributes,
} from '../../common/types';
import * as Registry from '../registry';

type CallESEndpoint = ScopedClusterClient['callAsCurrentUser'];

enum SavedObjectTypes {
  config = AssetTypes.config,
  dashboard = AssetTypes.dashboard,
  indexPattern = AssetTypes.indexPattern,
  search = AssetTypes.search,
  timelionSheet = AssetTypes.timelionSheet,
  visualization = AssetTypes.visualization,
}

export async function getIntegrations(client: SavedObjectsClientContract) {
  const registryItems = await Registry.fetchList();
  const searchObjects = registryItems.map(({ name, version }) => ({
    type: SAVED_OBJECT_TYPE,
    id: `${name}-${version}`,
  }));

  const results = await client.bulkGet<InstallationAttributes>(searchObjects);
  const savedObjects = results.saved_objects.filter(o => !o.error); // ignore errors for now
  const integrationList = registryItems
    .map(item =>
      createInstallableFrom(
        item,
        savedObjects.find(({ id }) => id === `${item.name}-${item.version}`)
      )
    )
    .sort(sortByName);

  return integrationList;
}

export async function getIntegrationInfo(client: SavedObjectsClientContract, pkgkey: string) {
  const [item, savedObject] = await Promise.all([
    Registry.fetchInfo(pkgkey),
    getInstallationObject(client, pkgkey),
  ]);
  const installation = createInstallableFrom(item, savedObject);

  return installation;
}

export async function getInstallationObject(client: SavedObjectsClientContract, pkgkey: string) {
  return client.get<InstallationAttributes>(SAVED_OBJECT_TYPE, pkgkey).catch(e => undefined);
}

export async function installIntegration(
  client: SavedObjectsClientContract,
  pkgkey: string,
  asset: string,
  callESEndpoint: CallESEndpoint
) {
  const installed = await installAssets(client, pkgkey, asset, callESEndpoint);

  if (installed.length) {
    const saved = await saveInstallationReferences(client, pkgkey, installed);
    return saved;
  }

  return [];
}

export async function removeInstallation(client: SavedObjectsClientContract, pkgkey: string) {
  const installation = await getInstallationObject(client, pkgkey);
  const installedObjects = (installation && installation.attributes.installed) || [];

  // Delete the manager saved object with references to the asset objects
  // could also update with [] or some other state
  await client.delete(SAVED_OBJECT_TYPE, pkgkey);

  // Delete the installed assets
  const deletePromises = installedObjects.map(async ({ id, type }) => client.delete(type, id));
  await Promise.all(deletePromises);

  // successful delete's in SO client return {}. return something more useful
  return installedObjects;
}

async function installObjects(
  client: SavedObjectsClientContract,
  pkgkey: string,
  asset: string
): Promise<AssetReference[]> {
  const filter = (entry: Registry.ArchiveEntry) => asset === Registry.pathParts(entry.path).type;
  const toBeSavedObjects = await Registry.getObjects(pkgkey, filter);
  const createResults = await client.bulkCreate<InstallationAttributes>(toBeSavedObjects, {
    overwrite: true,
  });
  const createdObjects = createResults.saved_objects;
  const installed = createdObjects.map(({ id, type }) => ({ id, type }));

  return installed;
}

async function installPipelines(callESEndpoint: CallESEndpoint, pkgkey: string) {
  const isSameType = ({ path }: Registry.ArchiveEntry) =>
    Registry.pathParts(path).type === AssetTypes.ingestPipeline;
  const paths = await Registry.getArchiveInfo(`${pkgkey}.tar.gz`, isSameType);
  const installationPromises = paths.map(path => installPipeline(callESEndpoint, path));
  const references = await Promise.all(installationPromises);

  return references;
}

async function installPipeline(
  callESEndpoint: CallESEndpoint,
  path: string
): Promise<AssetReference> {
  const buffer = Registry.getAsset(path);
  // sample data is invalid json. strip the offending parts before parsing
  const json = buffer.toString('utf8').replace(/\\/g, '');
  const pipeline = JSON.parse(json);
  const { file, type } = Registry.pathParts(path);
  const id = file.replace('.json', '');

  // TODO: any sort of error, not "happy path", handling
  await callESEndpoint('ingest.putPipeline', { id, body: pipeline });

  return { id, type };
}

async function installAssets(
  client: SavedObjectsClientContract,
  pkgkey: string,
  asset: string,
  callESEndpoint: CallESEndpoint
) {
  if (assetUsesObjects(asset)) {
    const references = await installObjects(client, pkgkey, asset);
    return references;
  }

  if (asset === AssetTypes.ingestPipeline) {
    const references = await installPipelines(callESEndpoint, pkgkey);
    return references;
  }

  return [];
}

async function saveInstallationReferences(
  client: SavedObjectsClientContract,
  pkgkey: string,
  toSave: AssetReference[]
) {
  const savedObject = await getInstallationObject(client, pkgkey);
  const savedRefs = (savedObject && savedObject.attributes.installed) || [];

  const toInstall = toSave.reduce((current, pending) => {
    const hasRef = current.find(c => c.id === pending.id && c.type === pending.type);
    if (!hasRef) current.push(pending);

    return current;
  }, savedRefs);

  const results = await client.create<InstallationAttributes>(
    SAVED_OBJECT_TYPE,
    { installed: toInstall },
    { id: pkgkey, overwrite: true }
  );

  return results;
}

function sortByName(a: { name: string }, b: { name: string }) {
  if (a.name > b.name) {
    return 1;
  } else if (a.name < b.name) {
    return -1;
  } else {
    return 0;
  }
}

function createInstallableFrom<T>(from: T, savedObject?: Installation): Installable<T> {
  return savedObject
    ? {
        ...from,
        status: InstallationStatus.installed,
        savedObject,
      }
    : {
        ...from,
        status: InstallationStatus.notInstalled,
      };
}

function assetUsesObjects(asset: string) {
  const values = Object.values(SavedObjectTypes);
  return values.includes(asset);
}
