/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract, ScopedClusterClient } from 'src/core/server/';
import {
  Installation,
  InstallationAttributes,
  Installable,
  AssetReference,
} from '../../common/types';
import { SAVED_OBJECT_TYPE } from '../../common/constants';
import * as Registry from '../registry';

type CallESEndpoint = ScopedClusterClient['callAsCurrentUser'];

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

export async function installAssets(
  client: SavedObjectsClientContract,
  pkgkey: string,
  asset: string,
  callESEndpoint: CallESEndpoint
) {
  let toInstall: AssetReference[] = [];

  if (assetUsesObjects(asset)) {
    const references = await installObjects(client, pkgkey, asset);
    toInstall = toInstall.concat(references);
  }

  if (asset === 'ingest-pipeline') {
    const paths = await Registry.getArchiveInfo(
      `${pkgkey}.tar.gz`,
      entry => Registry.pathParts(entry.path).type === asset
    );

    const installationPromises = paths.map(path => installPipeline(callESEndpoint, path));
    const references = await Promise.all(installationPromises);
    toInstall = toInstall.concat(references);
  }

  if (toInstall.length) {
    const savedObject = await getInstallationObject(client, pkgkey);
    const current: AssetReference[] = (savedObject && savedObject.attributes.installed) || [];
    const references = toInstall.reduce((toSave, pending) => {
      // skip if to be installed is already installed
      if (toSave.find(c => c.id === pending.id && c.type === pending.type)) return;

      toSave.push(pending);

      return toSave;
    }, current);

    const results = await client.create<InstallationAttributes>(
      SAVED_OBJECT_TYPE,
      { installed: references },
      { id: pkgkey, overwrite: true }
    );

    return results;
  }

  return toInstall; // []
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
        status: 'installed',
        savedObject,
      }
    : {
        ...from,
        status: 'not_installed',
      };
}

function assetUsesObjects(asset: string) {
  const usesObjects = [
    'visualization',
    'dashboard',
    'search',
    'index-pattern',
    'config',
    'timelion-sheet',
  ];
  return usesObjects.includes(asset);
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
