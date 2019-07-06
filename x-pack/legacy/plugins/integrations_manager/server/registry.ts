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
    paths.push(path);
    if (cacheHas(path)) return;
    if (buffer) cacheSet(path, buffer);
  };

  await extract(key, filter, onEntry);

  return paths;
}

export async function getObjects(pkgkey: string, type: string): Promise<SavedObject[]> {
  const paths = await getArchiveInfo(`${pkgkey}.tar.gz`);
  const toBeSavedObjects = new Map();

  for (const path of paths) {
    collectReferences(path, toBeSavedObjects, 'dashboard');
  }

  return Array.from(toBeSavedObjects.values(), ensureJsonValues);
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
