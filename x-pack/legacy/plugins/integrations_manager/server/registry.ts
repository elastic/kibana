/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObject } from 'src/core/server/saved_objects';
import { RegistryList, RegistryPackage } from '../common/types';
import { cacheGet, cacheSet, cacheHas } from './cache';
import { ArchiveEntry, untarBuffer, unzipBuffer } from './extract';
import { fetchUrl, getResponseStream } from './requests';
import { streamToBuffer } from './streams';

export { ArchiveEntry } from './extract';

const REGISTRY = process.env.REGISTRY || 'http://integrations-registry.app.elstc.co';

export async function fetchList(): Promise<RegistryList> {
  return fetchUrl(`${REGISTRY}/list`).then(JSON.parse);
}

export async function fetchInfo(key: string): Promise<RegistryPackage> {
  return fetchUrl(`${REGISTRY}/package/${key}`).then(JSON.parse);
}

export async function getArchiveInfo(
  key: string,
  filter = (entry: ArchiveEntry): boolean => true
): Promise<string[]> {
  const paths: string[] = [];
  const onEntry = (entry: ArchiveEntry) => {
    const { path, buffer } = entry;
    const { file } = pathParts(path);
    if (!file) return;
    if (cacheHas(path)) return;
    if (buffer) {
      cacheSet(path, buffer);
      paths.push(path);
    }
  };

  await extract(key, filter, onEntry);

  return paths;
}

export async function getObjects(
  pkgkey: string,
  filter = (entry: ArchiveEntry): boolean => true
): Promise<SavedObject[]> {
  // Create a Map b/c some values, especially index-patterns, are referenced multiple times
  const objects: Map<string, SavedObject> = new Map();

  // Get paths which match the given filter
  const paths = await getArchiveInfo(`${pkgkey}.tar.gz`, filter);

  // Add all objects which matched filter to the Map
  paths.map(getObject).forEach(obj => objects.set(obj.id, obj));

  // Each of those objects might have `references` property like [{id, type, name}]
  for (const object of objects.values()) {
    // For each of those objects
    for (const reference of object.references) {
      // Get the objects they reference. Call same function with a new filter
      const referencedObjects = await getObjects(pkgkey, (entry: ArchiveEntry) => {
        // Skip anything we've already stored
        if (objects.has(reference.id)) return false;

        // Is the archive entry the reference we want?
        const { type, file } = pathParts(entry.path);
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

export function pathParts(path: string) {
  const [pkgkey, service, type, file] = path.split('/');

  return { pkgkey, service, type, file };
}

async function extract(
  key: string,
  filter = (entry: ArchiveEntry): boolean => true,
  onEntry: (entry: ArchiveEntry) => void
) {
  const libExtract = key.endsWith('.zip') ? unzipBuffer : untarBuffer;
  const archiveBuffer = await getOrFetchArchiveBuffer(key);

  return libExtract(archiveBuffer, filter, onEntry);
}

async function getOrFetchArchiveBuffer(key: string): Promise<Buffer> {
  let buffer = cacheGet(key);
  if (!buffer) {
    buffer = await fetchArchiveBuffer(key);
    cacheSet(key, buffer);
  }

  if (buffer) {
    return buffer;
  } else {
    throw new Error(`no archive buffer for ${key}`);
  }
}

async function fetchArchiveBuffer(key: string): Promise<Buffer> {
  return getResponseStream(`${REGISTRY}/package/${key}`).then(streamToBuffer);
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
  const buffer = cacheGet(key);
  if (buffer === undefined) throw new Error(`Cannot find asset ${key}`);

  // cache values are buffers. convert to string / JSON
  const json = buffer.toString('utf8');
  // convert that to an object & address issues with the formatting of some parts
  const asset = ensureJsonValues(JSON.parse(json));

  const { type, file } = pathParts(key);
  if (!asset.type) asset.type = type;
  if (!asset.id) asset.id = file.replace('.json', '');

  return asset;
}
