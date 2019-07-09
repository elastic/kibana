/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

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
