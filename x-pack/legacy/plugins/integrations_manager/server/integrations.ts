/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObject } from 'src/core/server/saved_objects';
import { SAVED_OBJECT_TYPE } from '../common/constants';
import { Request, IntegrationListItem, IntegrationList } from '../common/types';
import { cacheGet } from './cache';
import * as Registry from './registry';
import { getClient, InstallationSavedObject } from './saved_objects';

interface PackageRequest extends Request {
  params: {
    pkgkey: string;
  };
}

interface InstallFeatureRequest extends PackageRequest {
  params: {
    pkgkey: string;
    feature: string;
  };
}

export async function handleGetList(req: Request) {
  const registryItems = await Registry.fetchList();
  const searchObjects = registryItems.map(({ name, version }) => ({
    type: SAVED_OBJECT_TYPE,
    id: `${name}-${version}`,
  }));
  const client = getClient(req);
  const results = await client.bulkGet(searchObjects);
  const savedObjects = results.saved_objects.filter(o => !o.error); // ignore errors for now
  const integrationList: IntegrationList = [];
  for (const item of registryItems) {
    const installedObject: InstallationSavedObject | undefined = savedObjects.find(
      ({ id }) => id === `${item.name}-${item.version}`
    );
    const integration: IntegrationListItem = installedObject
      ? {
          ...item,
          status: 'installed',
          savedObject: installedObject,
        }
      : {
          ...item,
          status: 'not_installed',
        };

    integrationList.push(integration);
  }

  return integrationList.sort((a, b) => {
    if (a.name > b.name) {
      return 1;
    } else if (a.name < b.name) {
      return -1;
    } else {
      return 0;
    }
  });
}

export async function handleGetInfo(req: PackageRequest) {
  const { pkgkey } = req.params;
  const [info, paths] = await Promise.all([
    Registry.fetchInfo(pkgkey),
    Registry.getArchiveInfo(`${pkgkey}.tar.gz`),
  ]);

  const savedObject = await getClient(req)
    .get(SAVED_OBJECT_TYPE, pkgkey)
    .catch(err => {
      /* swallow errors for now */
    });

  const status = savedObject && !savedObject.error ? 'installed' : 'not_installed';

  // map over paths and test types from https://github.com/elastic/integrations-registry/blob/master/ASSETS.md
  const features = ['injest-pipeline', 'visualization', 'dashboard', 'index-pattern'];

  return {
    ...info,
    paths,
    features,
    status,
    savedObject,
  };
}

export async function handleRequestInstall(req: InstallFeatureRequest) {
  const { pkgkey, feature } = req.params;

  if (feature === 'dashboard') {
    const toBeSavedObjects = await getObjects(pkgkey, feature);
    const client = getClient(req);
    const createResults = await client.bulkCreate(toBeSavedObjects, { overwrite: true });
    const installed = createResults.saved_objects.map(({ id, type }) => ({ id, type }));
    const mgrResults = await client.create(
      SAVED_OBJECT_TYPE,
      { installed },
      { id: pkgkey, overwrite: true }
    );

    return mgrResults;
  }

  return {
    pkgkey,
    feature,
    created: [],
  };
}

export async function handleRequestDelete(req: InstallFeatureRequest) {
  const { pkgkey, feature } = req.params;
  const client = getClient(req);

  const installation: InstallationSavedObject = await client.get(SAVED_OBJECT_TYPE, pkgkey);
  const installedObjects = installation.attributes.installed;

  // Delete the manager saved object with references to the asset objects
  // could also update with [] or some other state
  await client.delete(SAVED_OBJECT_TYPE, pkgkey);

  // ASK: should the manager uninstall the assets it installed
  // or just the references in SAVED_OBJECT_TYPE?
  if (feature === 'dashboard') {
    // Delete the installed assets
    const deletePromises = installedObjects.map(async ({ id, type }) => client.delete(type, id));
    await Promise.all(deletePromises);
  }

  return {
    pkgkey,
    feature,
    deleted: installedObjects || [],
  };
}

export async function getObjects(pkgkey: string, type: string): Promise<SavedObject[]> {
  const paths = await Registry.getArchiveInfo(`${pkgkey}.tar.gz`);
  const toBeSavedObjects = new Map();

  for (const path of paths) {
    collectReferences(path, toBeSavedObjects, 'dashboard');
  }

  return Array.from(toBeSavedObjects.values(), ensureJsonValues);
}

function getAsset(key: string) {
  const value = cacheGet(key);
  if (value !== undefined) {
    const json = value.toString('utf8');
    return JSON.parse(json);
  }
}

function collectReferences(
  path: string,
  toBeSavedObjects: Map<string, SavedObject> = new Map(),
  desiredType: string = 'dashboard'
) {
  const [pkgkey, service, type, file] = path.split('/');
  if (type !== desiredType) return;
  if (toBeSavedObjects.has(path)) return;
  if (!/\.json$/.test(path)) return;

  const asset = getAsset(path);
  if (!asset.type) asset.type = type;
  if (!asset.id) asset.id = file.replace('.json', '');
  toBeSavedObjects.set(path, asset);

  for (const reference of asset.references) {
    collectReferences(
      `${pkgkey}/${service}/${reference.type}/${reference.id}.json`,
      toBeSavedObjects,
      reference.type
    );
  }
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
