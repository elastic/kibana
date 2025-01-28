/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import type { ArtifactManifest } from '@kbn/product-doc-common';
import type { ZipArchive } from './zip_archive';

const manifestEntryPath = 'manifest.json';
const mappingsEntryPath = 'mappings.json';

export const loadManifestFile = async (archive: ZipArchive): Promise<ArtifactManifest> => {
  return await parseEntryContent<ArtifactManifest>(manifestEntryPath, archive);
};

export const loadMappingFile = async (archive: ZipArchive): Promise<MappingTypeMapping> => {
  return await parseEntryContent<MappingTypeMapping>(mappingsEntryPath, archive);
};

const parseEntryContent = async <T>(entryPath: string, archive: ZipArchive): Promise<T> => {
  if (!archive.hasEntry(entryPath)) {
    throw new Error(`Could not load archive file: "${entryPath}" not found in archive`);
  }
  try {
    const buffer = await archive.getEntryContent(entryPath);
    return JSON.parse(buffer.toString('utf-8'));
  } catch (e) {
    throw new Error(`Could not parse archive file: ${e}`);
  }
};
