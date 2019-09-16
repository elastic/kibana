/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  AssetsGroupedByServiceByType,
  AssetParts,
  CategorySummaryList,
  RegistryList,
  RegistryPackage,
} from '../../common/types';
import { cacheGet, cacheSet } from './cache';
import { ArchiveEntry, untarBuffer } from './extract';
import { fetchUrl, getResponseStream } from './requests';
import { streamToBuffer } from './streams';

export { ArchiveEntry } from './extract';

const REGISTRY = process.env.REGISTRY || 'http://integrations-registry.app.elstc.co';

export async function fetchList(): Promise<RegistryList> {
  return fetchUrl(`${REGISTRY}/search`).then(JSON.parse);
}

export async function fetchInfo(key: string): Promise<RegistryPackage> {
  return fetchUrl(`${REGISTRY}/package/${key}`).then(JSON.parse);
}

export async function fetchCategories(): Promise<CategorySummaryList> {
  return fetchUrl(`${REGISTRY}/categories`).then(JSON.parse);
}

export async function getArchiveInfo(
  pkgkey: string,
  filter = (entry: ArchiveEntry): boolean => true
): Promise<string[]> {
  // assume .tar.gz for now. add support for .zip if/when we need it
  const key = `${pkgkey}.tar.gz`;
  const paths: string[] = [];
  const onEntry = (entry: ArchiveEntry) => {
    const { path, buffer } = entry;
    const { file } = pathParts(path);
    if (!file) return;
    if (buffer) {
      cacheSet(path, buffer);
      paths.push(path);
    }
  };

  await extract(key, filter, onEntry);

  return paths;
}

export function pathParts(path: string): AssetParts {
  const [pkgkey, service, type, file] = path.split('/');
  const parts = { pkgkey, service, type, file, path } as AssetParts;

  return parts;
}

async function extract(
  key: string,
  filter = (entry: ArchiveEntry): boolean => true,
  onEntry: (entry: ArchiveEntry) => void
) {
  const archiveBuffer = await getOrFetchArchiveBuffer(key);

  return untarBuffer(archiveBuffer, filter, onEntry);
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

export function getAsset(key: string) {
  const buffer = cacheGet(key);
  if (buffer === undefined) throw new Error(`Cannot find asset ${key}`);

  return buffer;
}

export function groupPathsByService(paths: string[]) {
  // ASK: best way, if any, to avoid `any`?
  const byServiceByType: AssetsGroupedByServiceByType = paths.reduce((map: any, path) => {
    const parts = pathParts(path);
    if (!map[parts.service]) map[parts.service] = {};
    if (!map[parts.service][parts.type]) map[parts.service][parts.type] = [];
    map[parts.service][parts.type].push(parts);

    return map;
  }, {});

  return byServiceByType;
}
