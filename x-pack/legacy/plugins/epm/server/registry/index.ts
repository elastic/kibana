/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { URL } from 'url';
import { Response } from 'node-fetch';
import {
  AssetsGroupedByServiceByType,
  AssetParts,
  CategoryId,
  CategorySummaryList,
  KibanaAssetType,
  RegistryList,
  RegistryPackage,
} from '../../common/types';
import { cacheGet, cacheSet } from './cache';
import { ArchiveEntry, untarBuffer } from './extract';
import { fetchUrl, getResponseStream, getResponse } from './requests';
import { streamToBuffer } from './streams';
import { epmConfigStore } from '../config';

export { ArchiveEntry } from './extract';

export interface SearchParams {
  category?: CategoryId;
}

export async function fetchList(params?: SearchParams): Promise<RegistryList> {
  const { registryUrl } = epmConfigStore.getConfig();
  const url = new URL(`${registryUrl}/search`);
  if (params && params.category) {
    url.searchParams.set('category', params.category);
  }

  return fetchUrl(url.toString()).then(JSON.parse);
}

export async function fetchInfo(key: string): Promise<RegistryPackage> {
  const { registryUrl } = epmConfigStore.getConfig();
  return fetchUrl(`${registryUrl}/package/${key}`).then(JSON.parse);
}

export async function fetchFile(filePath: string): Promise<Response> {
  const { registryUrl } = epmConfigStore.getConfig();
  return getResponse(`${registryUrl}${filePath}`);
}

export async function fetchCategories(): Promise<CategorySummaryList> {
  const { registryUrl } = epmConfigStore.getConfig();
  return fetchUrl(`${registryUrl}/categories`).then(JSON.parse);
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
  let dataset;

  let [pkgkey, service, type, file] = path.split('/');

  // if it's a dataset
  if (service === 'dataset') {
    // save the dataset name
    dataset = type;
    // drop the `dataset/dataset-name` portion & re-parse
    [pkgkey, service, type, file] = path.replace(`dataset/${dataset}/`, '').split('/');
  }

  // This is to cover for the fields.yml files inside the "fields" directory
  if (file === undefined) {
    file = type;
    type = 'fields';
    service = '';
  }

  return {
    pkgkey,
    service,
    type,
    file,
    dataset,
    path,
  } as AssetParts;
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
  const { registryUrl } = epmConfigStore.getConfig();
  return getResponseStream(`${registryUrl}/package/${key}`).then(streamToBuffer);
}

export function getAsset(key: string) {
  const buffer = cacheGet(key);
  if (buffer === undefined) throw new Error(`Cannot find asset ${key}`);

  return buffer;
}

export function groupPathsByService(paths: string[]): AssetsGroupedByServiceByType {
  // ASK: best way, if any, to avoid `any`?
  const assets = paths.reduce((map: any, path) => {
    const parts = pathParts(path.replace(/^\/package\//, ''));
    if (parts.type in KibanaAssetType) {
      if (!map[parts.service]) map[parts.service] = {};
      if (!map[parts.service][parts.type]) map[parts.service][parts.type] = [];
      map[parts.service][parts.type].push(parts);
    }

    return map;
  }, {});

  return {
    kibana: assets.kibana,
    // elasticsearch: assets.elasticsearch,
  };
}
