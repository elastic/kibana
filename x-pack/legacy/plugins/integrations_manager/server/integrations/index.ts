/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  SavedObject,
  SavedObjectReference,
  SavedObjectsClientContract,
} from 'src/core/server/saved_objects';
import { SAVED_OBJECT_TYPE } from '../../common/constants';
import {
  InstallationSavedObject,
  IntegrationInfo,
  IntegrationListItem,
  RegistryList,
  RegistryListItem,
  RegistryPackage,
} from '../../common/types';
import { cacheGet } from '../cache';
import * as Registry from '../registry';

export * from './handlers';

function getAsset(key: string) {
  const value = cacheGet(key);
  if (value !== undefined) {
    const json = value.toString('utf8');
    return JSON.parse(json);
  }
}

interface CollectReferencesOptions {
  path: string;
  desiredType: string; // TODO: from enum or similar of acceptable asset types
}
function collectReferences(
  toBeSavedObjects: Map<string, SavedObject> = new Map(),
  { path, desiredType = 'dashboard' }: CollectReferencesOptions
) {
  const [pkgkey, service, type, file] = path.split('/');
  if (type !== desiredType) return;
  if (toBeSavedObjects.has(path)) return;
  if (!/\.json$/.test(path)) return;

  const asset = getAsset(path);
  if (!asset.type) asset.type = type;
  if (!asset.id) asset.id = file.replace('.json', '');
  toBeSavedObjects.set(path, asset);

  const references: SavedObjectReference[] = asset.references;
  return references.reduce((map, reference) => {
    collectReferences(toBeSavedObjects, {
      path: `${pkgkey}/${service}/${reference.type}/${reference.id}.json`,
      desiredType: reference.type,
    });
    return map;
  }, toBeSavedObjects);
}

// the assets from the registry are malformed
// https://github.com/elastic/integrations-registry/issues/42
function ensureJsonValues(obj: SavedObject) {
  const { attributes } = obj;
  if (
    attributes.kibanaSavedObjectMeta &&
    typeof attributes.kibanaSavedObjectMeta.searchSourceJSON !== 'string'
  ) {
    attributes.kibanaSavedObjectMeta.searchSourceJSON = JSON.stringify(
      attributes.kibanaSavedObjectMeta.searchSourceJSON
    );
  }
  ['optionsJSON', 'panelsJSON', 'uiStateJSON', 'visState']
    .filter(key => typeof attributes[key] !== 'string')
    .forEach(key => (attributes[key] = JSON.stringify(attributes[key])));
  return obj;
}

export function createIntegrationList(
  registryItems: RegistryList,
  integrationObjects: InstallationSavedObject[]
) {
  const integrationList = registryItems.map(item =>
    createInstallationObject(
      item,
      integrationObjects.find(({ id }) => id === `${item.name}-${item.version}`)
    )
  );

  return integrationList.sort(sortByName);
}

export function createInstallationObject(
  item: RegistryPackage,
  savedObject?: InstallationSavedObject
): IntegrationInfo;
export function createInstallationObject(
  item: RegistryListItem,
  savedObject?: InstallationSavedObject
): IntegrationListItem;
export function createInstallationObject(
  obj: RegistryPackage | RegistryListItem,
  savedObject?: InstallationSavedObject
) {
  return savedObject
    ? {
        ...obj,
        status: 'installed',
        savedObject,
      }
    : {
        ...obj,
        status: 'not_installed',
      };
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

export async function getInstallationObject(
  client: SavedObjectsClientContract,
  pkgkey: string
): Promise<InstallationSavedObject | undefined> {
  return client.get(SAVED_OBJECT_TYPE, pkgkey).catch(e => undefined);
}

export async function getObjects(pkgkey: string, type: string): Promise<SavedObject[]> {
  const paths = await Registry.getArchiveInfo(`${pkgkey}.tar.gz`);
  const toBeSavedObjects = paths.reduce((map, path) => {
    collectReferences(map, { path, desiredType: 'dashboard' });
    return map;
  }, new Map());

  return Array.from(toBeSavedObjects.values(), ensureJsonValues);
}
