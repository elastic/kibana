/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObject, SavedObjectsClientContract } from 'src/core/server/';
import { SAVED_OBJECT_TYPE, ASSET_TYPE_INGEST_PIPELINE } from '../../common/constants';
import { AssetReference, AssetType, InstallationAttributes } from '../../common/types';
import * as Registry from '../registry';
import { CallESAsCurrentUser, assetUsesObjects, getInstallationObject } from './index';

type ArchiveAsset = Pick<SavedObject, 'attributes' | 'migrationVersion' | 'references'>;
type SavedObjectToBe = Required<SavedObjectsBulkCreateObject>;

export async function installIntegration(options: {
  savedObjectsClient: SavedObjectsClientContract;
  pkgkey: string;
  asset: AssetType;
  callCluster: CallESAsCurrentUser;
}) {
  const { savedObjectsClient, pkgkey, asset, callCluster } = options;
  // install any assets (in ES, as Saved Objects, etc) as required. Get references to them
  const toSave = await installAssets({ savedObjectsClient, pkgkey, asset, callCluster });

  if (toSave.length) {
    // saved those references in the integration manager's state object
    const saved = await saveInstallationReferences({ savedObjectsClient, pkgkey, toSave });
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
  if (asset === ASSET_TYPE_INGEST_PIPELINE) {
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
    Registry.pathParts(path).type === ASSET_TYPE_INGEST_PIPELINE;
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

async function getObjects(
  pkgkey: string,
  filter = (entry: Registry.ArchiveEntry): boolean => true
): Promise<SavedObjectToBe[]> {
  // Create a Map b/c some values, especially index-patterns, are referenced multiple times
  const objects: Map<string, SavedObjectToBe> = new Map();

  // Get paths which match the given filter
  const paths = await Registry.getArchiveInfo(pkgkey, filter);

  // Get all objects which matched filter. Add them to the Map
  const rootObjects = paths.map(getObject);
  rootObjects.forEach(obj => objects.set(obj.id, obj));

  // Each of those objects might have `references` property like [{id, type, name}]
  for (const object of rootObjects) {
    // For each of those objects, if they have references
    for (const reference of object.references) {
      // Get the referenced objects. Call same function with a new filter
      const referencedObjects = await getObjects(pkgkey, (entry: Registry.ArchiveEntry) => {
        // Skip anything we've already stored
        if (objects.has(reference.id)) return false;

        // Is the archive entry the reference we want?
        const { type, file } = Registry.pathParts(entry.path);
        const isType = type === reference.type;
        const isJson = file === `${reference.id}.json`;

        return isType && isJson;
      });

      // Add referenced objects to the Map
      referencedObjects.forEach(ro => objects.set(ro.id, ro));
    }
  }

  // return the array of unique objects
  return Array.from(objects.values());
}

// the assets from the registry are malformed
// https://github.com/elastic/integrations-registry/issues/42
function ensureJsonValues(obj: SavedObjectToBe) {
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

function getObject(key: string) {
  const buffer = Registry.getAsset(key);

  // cache values are buffers. convert to string / JSON
  const json = buffer.toString('utf8');
  // convert that to an object & address issues with the formatting of some parts
  const asset: ArchiveAsset = ensureJsonValues(JSON.parse(json));

  const { type, file } = Registry.pathParts(key);
  const savedObject: SavedObjectToBe = {
    type,
    id: file.replace('.json', ''),
    attributes: asset.attributes,
    references: asset.references || [],
    migrationVersion: asset.migrationVersion || {},
  };

  return savedObject;
}
