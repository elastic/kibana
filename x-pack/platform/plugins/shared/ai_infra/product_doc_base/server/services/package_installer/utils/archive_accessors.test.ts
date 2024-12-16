/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import type { ArtifactManifest } from '@kbn/product-doc-common';
import type { ZipArchive } from './zip_archive';
import { loadManifestFile, loadMappingFile } from './archive_accessors';

const createMockArchive = (entries: Record<string, string>): ZipArchive => {
  return {
    hasEntry: (entryPath) => Object.keys(entries).includes(entryPath),
    getEntryPaths: () => Object.keys(entries),
    getEntryContent: async (entryPath) => Buffer.from(entries[entryPath]),
    close: () => undefined,
  };
};

describe('loadManifestFile', () => {
  it('parses the manifest from the archive', async () => {
    const manifest: ArtifactManifest = {
      formatVersion: '1.0.0',
      productName: 'kibana',
      productVersion: '8.16',
    };
    const archive = createMockArchive({ 'manifest.json': JSON.stringify(manifest) });

    const parsedManifest = await loadManifestFile(archive);

    expect(parsedManifest).toEqual(manifest);
  });

  it('throws if the archive does not contain the manifest', async () => {
    const archive = createMockArchive({});

    await expect(loadManifestFile(archive)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Could not load archive file: \\"manifest.json\\" not found in archive"`
    );
  });

  it('throws if the manifest cannot be parsed', async () => {
    const archive = createMockArchive({ 'manifest.json': '{}}}{' });

    await expect(loadManifestFile(archive)).rejects.toThrowError();
  });
});

describe('loadMappingFile', () => {
  it('parses the manifest from the archive', async () => {
    const mappings: MappingTypeMapping = {
      properties: {
        foo: { type: 'text' },
      },
    };
    const archive = createMockArchive({ 'mappings.json': JSON.stringify(mappings) });

    const parsedMappings = await loadMappingFile(archive);

    expect(parsedMappings).toEqual(mappings);
  });

  it('throws if the archive does not contain the manifest', async () => {
    const archive = createMockArchive({});

    await expect(loadMappingFile(archive)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Could not load archive file: \\"mappings.json\\" not found in archive"`
    );
  });

  it('throws if the manifest cannot be parsed', async () => {
    const archive = createMockArchive({ 'mappings.json': '{}}}{' });

    await expect(loadMappingFile(archive)).rejects.toThrowError();
  });
});
