/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import YAML from 'yaml';
import {
  ContentPack,
  ContentPackDashboard,
  ContentPackDataView,
  ContentPackEntry,
  ContentPackManifest,
  ContentPackSavedObject,
  contentPackManifestSchema,
} from '@kbn/content-packs-schema';
import AdmZip from 'adm-zip';
import path from 'path';
import { Readable } from 'stream';
import { pick, uniqBy } from 'lodash';

const ARCHIVE_ENTRY_MAX_SIZE_BYTES = 1 * 1024 * 1024; // 1MB

export async function parseArchive(archive: Readable): Promise<ContentPack> {
  const zip: AdmZip = await new Promise((resolve, reject) => {
    const bufs: Buffer[] = [];
    archive.on('data', (chunk: Buffer) => bufs.push(chunk));
    archive.on('end', () => {
      try {
        resolve(new AdmZip(Buffer.concat(bufs)));
      } catch (err) {
        reject(new Error('Invalid content pack format'));
      }
    });
    archive.on('error', (error) => reject(error));
  });

  const manifest = await extractManifest(zip);
  const entries = await extractEntries(zip);

  return { ...manifest, entries };
}

export async function generateArchive(manifest: ContentPackManifest, objects: ContentPackEntry[]) {
  const zip = new AdmZip();
  const rootDir = `${manifest.name}-${manifest.version}`;

  objects.forEach((object: ContentPackEntry) => {
    if (object.type === 'dashboard' || object.type === 'index-pattern') {
      const dir = object.type === 'dashboard' ? 'dashboard' : 'index_pattern';
      zip.addFile(
        path.join(rootDir, 'kibana', dir, `${object.id}.json`),
        Buffer.from(JSON.stringify(object, null, 2))
      );
    }
  });

  zip.addFile(
    path.join(rootDir, 'manifest.yml'),
    Buffer.from(YAML.stringify(pick(manifest, ['name', 'description', 'version'])))
  );

  return zip.toBufferPromise();
}

async function readEntry(entry: AdmZip.IZipEntry): Promise<Buffer> {
  const buf = await new Promise<Buffer>((resolve, reject) => {
    entry.getDataAsync((data, err) => {
      if (err) return reject(new Error(err));
      resolve(data);
    });
  });

  return buf;
}

async function extractManifest(zip: AdmZip): Promise<ContentPackManifest> {
  const entry = zip.getEntry('manifest.yml');
  if (!entry) {
    throw new Error('Missing content pack manifest');
  }

  const { data: manifest, success } = contentPackManifestSchema.safeParse(
    YAML.parse((await readEntry(entry)).toString())
  );
  if (!success) {
    throw new Error('Invalid content pack manifest format');
  }

  return manifest;
}

async function extractEntries(zip: AdmZip): Promise<ContentPackEntry[]> {
  const entries: ContentPackEntry[] = (
    await Promise.all(
      zip.getEntries().map((entry) => {
        const filepath = path.join(...entry.entryName.split(path.sep).slice(1));
        const dirname = path.dirname(filepath);
        if (dirname === path.join('kibana', 'dashboard')) {
          return resolveDashboard(zip, entry);
        }
        return [];
      })
    )
  ).flat();

  return entries;
}

async function resolveDashboard(
  zip: AdmZip,
  dashboardEntry: AdmZip.IZipEntry
): Promise<ContentPackSavedObject[]> {
  assertUncompressedSize(dashboardEntry);

  const dashboard = JSON.parse(
    (await readEntry(dashboardEntry)).toString()
  ) as ContentPackDashboard;

  const references = uniqBy(dashboard.references, (ref) => ref.id);
  if (references.some(({ type }) => type !== 'index-pattern')) {
    throw new Error(
      `Unsupported reference type [${
        references.find(({ type }) => type !== 'index-pattern')!.type
      }]`
    );
  }

  const dataViews = await Promise.all(
    references
      .filter((ref) => {
        const refEntry = zip.getEntry(path.join('kibana', 'index_pattern', `${ref.id}.json`));
        if (!refEntry) return false;
        assertUncompressedSize(refEntry);
        return true;
      })
      .map(async (ref) => {
        const refEntry = zip.getEntry(path.join('kibana', 'index_pattern', `${ref.id}.json`))!;
        return JSON.parse((await readEntry(refEntry)).toString()) as ContentPackDataView;
      })
  );

  return [dashboard, ...dataViews];
}

function assertUncompressedSize(entry: AdmZip.IZipEntry) {
  if (entry.header.size > ARCHIVE_ENTRY_MAX_SIZE_BYTES) {
    throw new Error(
      `Object [${entry.entryName}] exceeds the limit of ${ARCHIVE_ENTRY_MAX_SIZE_BYTES} bytes`
    );
  }
}
