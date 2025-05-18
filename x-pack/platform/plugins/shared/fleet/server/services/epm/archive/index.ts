/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ArchiveEntry,
  ArchiveIterator,
  AssetParts,
  AssetsMap,
} from '../../../../common/types';
import {
  PackageInvalidArchiveError,
  PackageUnsupportedMediaTypeError,
  PackageNotFoundError,
} from '../../../errors';

import { createArchiveIterator } from './archive_iterator';

import { deletePackageInfo } from './cache';
import type { SharedKey } from './cache';
import { getBufferExtractor } from './extract';

export * from './cache';
export { getBufferExtractor, untarBuffer, unzipBuffer } from './extract';
export { generatePackageInfoFromArchiveBuffer } from './parse';

export async function unpackBufferToAssetsMap({
  contentType,
  archiveBuffer,
  useStreaming,
}: {
  contentType: string;
  archiveBuffer: Buffer;
  useStreaming: boolean | undefined;
}): Promise<{ paths: string[]; assetsMap: AssetsMap; archiveIterator: ArchiveIterator }> {
  const archiveIterator = createArchiveIterator(archiveBuffer, contentType);
  let paths: string[] = [];
  let assetsMap: AssetsMap = new Map();
  if (useStreaming) {
    paths = await archiveIterator.getPaths();
    // We keep the assetsMap empty as we don't want to load all the assets in memory
    assetsMap = new Map();
  } else {
    const entries = await unpackArchiveEntriesIntoMemory(archiveBuffer, contentType);

    entries.forEach((entry) => {
      const { path, buffer } = entry;
      if (buffer) {
        assetsMap.set(path, buffer);
        paths.push(path);
      }
    });
  }

  return { paths, assetsMap, archiveIterator };
}

/**
 * This function extracts all archive entries into memory.
 *
 * NOTE: This is potentially dangerous for large archives and can cause OOM
 * errors. Use 'traverseArchiveEntries' instead to iterate over the entries
 * without storing them all in memory at once.
 *
 * @param archiveBuffer
 * @param contentType
 * @returns All the entries in the archive buffer
 */
export async function unpackArchiveEntriesIntoMemory(
  archiveBuffer: Buffer,
  contentType: string
): Promise<ArchiveEntry[]> {
  const entries: ArchiveEntry[] = [];
  const addToEntries = async (entry: ArchiveEntry) => void entries.push(entry);
  await traverseArchiveEntries(archiveBuffer, contentType, addToEntries);

  // While unpacking a tar.gz file with unzipBuffer() will result in a thrown
  // error, unpacking a zip file with untarBuffer() just results in nothing.
  if (entries.length === 0) {
    throw new PackageInvalidArchiveError(
      `Archive seems empty. Assumed content type was ${contentType}, check if this matches the archive type.`
    );
  }
  return entries;
}

export async function traverseArchiveEntries(
  archiveBuffer: Buffer,
  contentType: string,
  onEntry: (entry: ArchiveEntry) => Promise<void>,
  readBuffer?: (path: string) => boolean
) {
  const bufferExtractor = getBufferExtractor({ contentType });
  if (!bufferExtractor) {
    throw new PackageUnsupportedMediaTypeError(
      `Unsupported media type ${contentType}. Please use 'application/gzip' or 'application/zip'`
    );
  }
  try {
    const onlyFiles = ({ path }: ArchiveEntry): boolean => !path.endsWith('/');
    await bufferExtractor(archiveBuffer, onlyFiles, onEntry, readBuffer);
  } catch (error) {
    throw new PackageInvalidArchiveError(
      `Error during extraction of package: ${error}. Assumed content type was ${contentType}, check if this matches the archive type.`
    );
  }
}

export const deletePackageCache = ({ name, version }: SharedKey) => {
  deletePackageInfo({ name, version });
};

export function getPathParts(path: string): AssetParts {
  let dataset;

  let [pkgkey, service, type, file] = path.split('/');

  // if it's a data stream
  if (service === 'data_stream') {
    // save the dataset name
    dataset = type;
    // drop the `data_stream/dataset-name` portion & re-parse
    [pkgkey, service, type, file] = path.replace(`data_stream/${dataset}/`, '').split('/');
  }

  // To support the NOTICE asset at the root level
  if (service === 'NOTICE.txt') {
    file = service;
    type = 'notice';
    service = '';
  }

  // To support the LICENSE asset at the root level
  if (service === 'LICENSE.txt') {
    file = service;
    type = 'license';
    service = '';
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

export function getAssetFromAssetsMap(assetsMap: AssetsMap, key: string) {
  const buffer = assetsMap.get(key);
  if (buffer === undefined) throw new PackageNotFoundError(`Cannot find asset ${key}`);

  return buffer;
}
