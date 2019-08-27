/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'src/core/server/';
import { SAVED_OBJECT_TYPE } from '../../common/constants';
import { InstallationAttributes } from '../../common/types';
import * as Registry from '../registry';
import { createInstallableFrom } from './index';

function nameAsTitle(name: string) {
  return name.charAt(0).toUpperCase() + name.substr(1).toLowerCase();
}

export async function getIntegrations(options: { savedObjectsClient: SavedObjectsClientContract }) {
  const { savedObjectsClient } = options;
  const registryItems = await Registry.fetchList().then(items =>
    items.map(item => Object.assign({}, item, { title: item.title || nameAsTitle(item.name) }))
  );
  const searchObjects = registryItems.map(({ name, version }) => ({
    type: SAVED_OBJECT_TYPE,
    id: `${name}-${version}`,
  }));
  const results = await savedObjectsClient.bulkGet<InstallationAttributes>(searchObjects);
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

export async function getIntegrationInfo(options: {
  savedObjectsClient: SavedObjectsClientContract;
  pkgkey: string;
}) {
  const { savedObjectsClient, pkgkey } = options;
  const [item, savedObject, paths] = await Promise.all([
    Registry.fetchInfo(pkgkey),
    getInstallationObject({ savedObjectsClient, pkgkey }),
    Registry.getArchiveInfo(pkgkey),
  ]);

  // add properties that aren't (or aren't yet) on Registry response
  const updated = Object.assign({}, item, {
    title: item.title || nameAsTitle(item.name),
    assets: Registry.groupPathsByService(paths),
  });

  return createInstallableFrom(updated, savedObject);
}

export async function getInstallationObject(options: {
  savedObjectsClient: SavedObjectsClientContract;
  pkgkey: string;
}) {
  const { savedObjectsClient, pkgkey } = options;
  return savedObjectsClient
    .get<InstallationAttributes>(SAVED_OBJECT_TYPE, pkgkey)
    .catch(e => undefined);
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
