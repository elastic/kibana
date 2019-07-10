/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  SavedObject,
  SavedObjectsBulkGetObject,
  SavedObjectsClientContract,
} from 'src/core/server/saved_objects';
import { Installation, InstallationAttributes, Installable } from '../../common/types';
import { SAVED_OBJECT_TYPE } from '../../common/constants';
import * as Registry from '../registry';

export async function getIntegrations(client: SavedObjectsClientContract) {
  const registryItems = await Registry.fetchList();
  const searchObjects: SavedObjectsBulkGetObject[] = registryItems.map(({ name, version }) => ({
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
  filter = (entry: Registry.ArchiveEntry): boolean => true
) {
  const toBeSavedObjects = await Registry.getObjects(pkgkey, filter);
  const createResults = await client.bulkCreate<InstallationAttributes>(toBeSavedObjects, {
    overwrite: true,
  });
  const createdObjects: SavedObject[] = createResults.saved_objects;
  const installed = createdObjects.map(({ id, type }) => ({ id, type }));
  const results = await client.create<InstallationAttributes>(
    SAVED_OBJECT_TYPE,
    { installed },
    { id: pkgkey, overwrite: true }
  );

  return results;
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
