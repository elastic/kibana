/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  ClusterClient,
  SavedObject,
  SavedObjectsClientContract,
  ScopedClusterClient,
} from 'src/core/server/';
import { SAVED_OBJECT_TYPE, AssetTypes, InstallationStatus } from '../../common/constants';
import {
  AssetReference,
  Installable,
  Installation,
  InstallationAttributes,
  Request,
} from '../../common/types';
import * as Registry from '../registry';

type CallESAsCurrentUser = ScopedClusterClient['callAsCurrentUser'];

enum SavedObjectTypes {
  config = AssetTypes.config,
  dashboard = AssetTypes.dashboard,
  indexPattern = AssetTypes.indexPattern,
  search = AssetTypes.search,
  timelionSheet = AssetTypes.timelionSheet,
  visualization = AssetTypes.visualization,
}

interface GetIntegrationsOptions {
  savedObjectsClient: SavedObjectsClientContract;
}
export async function getIntegrations({ savedObjectsClient }: GetIntegrationsOptions) {
  const registryItems = await Registry.fetchList();
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

interface GetIntegrationInfoOptions {
  savedObjectsClient: SavedObjectsClientContract;
  pkgkey: string;
}
export async function getIntegrationInfo({
  savedObjectsClient,
  pkgkey,
}: GetIntegrationInfoOptions) {
  const [item, savedObject] = await Promise.all([
    Registry.fetchInfo(pkgkey),
    getInstallationObject({ savedObjectsClient, pkgkey }),
  ]);
  const installation = createInstallableFrom(item, savedObject);

  return installation;
}

interface GetInstallationObjectOptions {
  savedObjectsClient: SavedObjectsClientContract;
  pkgkey: string;
}
export async function getInstallationObject({
  savedObjectsClient,
  pkgkey,
}: GetInstallationObjectOptions) {
  return savedObjectsClient
    .get<InstallationAttributes>(SAVED_OBJECT_TYPE, pkgkey)
    .catch(e => undefined);
}

interface InstallIntegrationOptions {
  savedObjectsClient: SavedObjectsClientContract;
  pkgkey: string;
  asset: string;
  callCluster: CallESAsCurrentUser;
}
export async function installIntegration({
  savedObjectsClient,
  pkgkey,
  asset,
  callCluster,
}: InstallIntegrationOptions) {
  const toSave = await installAssets({ savedObjectsClient, pkgkey, asset, callCluster });

  if (toSave.length) {
    const saved = await saveInstallationReferences({ savedObjectsClient, pkgkey, toSave });
    return saved;
  }

  return [];
}

interface RemoveIntegrationOptions {
  savedObjectsClient: SavedObjectsClientContract;
  pkgkey: string;
}
export async function removeInstallation({ savedObjectsClient, pkgkey }: RemoveIntegrationOptions) {
  const installation = await getInstallationObject({ savedObjectsClient, pkgkey });
  const installedObjects = (installation && installation.attributes.installed) || [];

  // Delete the manager saved object with references to the asset objects
  // could also update with [] or some other state
  await savedObjectsClient.delete(SAVED_OBJECT_TYPE, pkgkey);

  // Delete the installed assets
  const deletePromises = installedObjects.map(async ({ id, type }) =>
    savedObjectsClient.delete(type, id)
  );
  await Promise.all(deletePromises);

  // successful delete's in SO client return {}. return something more useful
  return installedObjects;
}

export function getClusterAccessor(esClient: ClusterClient, req: Request) {
  return esClient.asScoped(req).callAsCurrentUser;
}

interface InstallObjectsOptions {
  savedObjectsClient: SavedObjectsClientContract;
  pkgkey: string;
  asset: string;
}
async function installObjects({
  savedObjectsClient,
  pkgkey,
  asset,
}: InstallObjectsOptions): Promise<AssetReference[]> {
  const filter = (entry: Registry.ArchiveEntry) => asset === Registry.pathParts(entry.path).type;
  const toBeSavedObjects = await getObjects(pkgkey, filter);
  const createResults = await savedObjectsClient.bulkCreate<InstallationAttributes>(
    toBeSavedObjects,
    {
      overwrite: true,
    }
  );
  const createdObjects = createResults.saved_objects;
  const installed = createdObjects.map(({ id, type }) => ({ id, type }));

  return installed;
}

interface InstallPipelinesOptions {
  callCluster: CallESAsCurrentUser;
  pkgkey: string;
}
async function installPipelines({ callCluster, pkgkey }: InstallPipelinesOptions) {
  const isPipeline = ({ path }: Registry.ArchiveEntry) =>
    Registry.pathParts(path).type === AssetTypes.ingestPipeline;
  const paths = await Registry.getArchiveInfo(`${pkgkey}.tar.gz`, isPipeline);
  const installationPromises = paths.map(path => installPipeline({ callCluster, path }));
  const references = await Promise.all(installationPromises);

  return references;
}

interface InstallPipelineOptions {
  callCluster: CallESAsCurrentUser;
  path: string;
}
async function installPipeline({
  callCluster,
  path,
}: InstallPipelineOptions): Promise<AssetReference> {
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

interface InstallAssetsOptions {
  savedObjectsClient: SavedObjectsClientContract;
  pkgkey: string;
  asset: string;
  callCluster: CallESAsCurrentUser;
}
async function installAssets({
  savedObjectsClient,
  pkgkey,
  asset,
  callCluster,
}: InstallAssetsOptions) {
  if (assetUsesObjects(asset)) {
    const references = await installObjects({ savedObjectsClient, pkgkey, asset });
    return references;
  }

  if (asset === AssetTypes.ingestPipeline) {
    const references = await installPipelines({ callCluster, pkgkey });
    return references;
  }

  return [];
}

interface SaveInstallationReferencesOptions {
  savedObjectsClient: SavedObjectsClientContract;
  pkgkey: string;
  toSave: AssetReference[];
}
async function saveInstallationReferences({
  savedObjectsClient,
  pkgkey,
  toSave,
}: SaveInstallationReferencesOptions) {
  const savedObject = await getInstallationObject({ savedObjectsClient, pkgkey });
  const savedRefs = (savedObject && savedObject.attributes.installed) || [];

  const toInstall = toSave.reduce((current, pending) => {
    const hasRef = current.find(c => c.id === pending.id && c.type === pending.type);
    if (!hasRef) current.push(pending);

    return current;
  }, savedRefs);

  const results = await savedObjectsClient.create<InstallationAttributes>(
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

async function getObjects(
  pkgkey: string,
  filter = (entry: Registry.ArchiveEntry): boolean => true
): Promise<SavedObject[]> {
  // Create a Map b/c some values, especially index-patterns, are referenced multiple times
  const objects: Map<string, SavedObject> = new Map();

  // Get paths which match the given filter
  const paths = await Registry.getArchiveInfo(`${pkgkey}.tar.gz`, filter);

  // Get all objects which matched filter. Add them to the Map
  const rootObjects = paths.map(getObject);
  rootObjects.forEach(obj => objects.set(obj.id, obj));

  // Each of those objects might have `references` property like [{id, type, name}]
  for (const object of rootObjects) {
    // For each of those objects
    for (const reference of object.references) {
      // Get the objects they reference. Call same function with a new filter
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

function getObject(key: string) {
  const buffer = Registry.getAsset(key);

  // cache values are buffers. convert to string / JSON
  const json = buffer.toString('utf8');
  // convert that to an object & address issues with the formatting of some parts
  const asset = ensureJsonValues(JSON.parse(json));

  const { type, file } = Registry.pathParts(key);
  const savedObject: SavedObject = {
    type: asset.type || type,
    id: asset.id || file.replace('.json', ''),
    attributes: asset,
    references: asset.references || [],
  };

  return savedObject;
}
