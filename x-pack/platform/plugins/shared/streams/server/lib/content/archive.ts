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
  ContentPackEntry,
  ContentPackManifest,
  ContentPackSavedObject,
  SUPPORTED_SAVED_OBJECT_TYPE,
  SupportedSavedObjectType,
  contentPackManifestSchema,
  isDashboardFile,
  isSupportedReferenceType,
  isSupportedSavedObjectType,
} from '@kbn/content-packs-schema';
import AdmZip from 'adm-zip';
import path from 'path';
import { Readable } from 'stream';
import { compact, pick, uniqBy } from 'lodash';
import { InvalidContentPackError } from './error';

const ARCHIVE_ENTRY_MAX_SIZE_BYTES = 1 * 1024 * 1024; // 1MB

export async function parseArchive(archive: Readable): Promise<ContentPack> {
  const zip: AdmZip = await new Promise((resolve, reject) => {
    const bufs: Buffer[] = [];
    archive.on('data', (chunk: Buffer) => bufs.push(chunk));
    archive.on('end', () => {
      try {
        resolve(new AdmZip(Buffer.concat(bufs)));
      } catch (err) {
        reject(new InvalidContentPackError('Invalid content pack format'));
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
    if (isSupportedSavedObjectType(object)) {
      const dir = SUPPORTED_SAVED_OBJECT_TYPE[object.type];
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
    throw new InvalidContentPackError('Missing content pack manifest');
  }

  const { data: manifest, success } = contentPackManifestSchema.safeParse(
    YAML.parse((await readEntry(entry)).toString())
  );
  if (!success) {
    throw new InvalidContentPackError('Invalid content pack manifest format');
  }

  return manifest;
}

async function extractEntries(zip: AdmZip): Promise<ContentPackEntry[]> {
  const entries = await Promise.all(
    zip
      .getEntries()
      .filter((entry) => {
        const filepath = path.join(...entry.entryName.split(path.sep).slice(1));
        return isDashboardFile(filepath);
      })
      .map((entry) => resolveDashboard(zip, entry))
  );

  return entries.flat();
}

async function resolveDashboard(
  zip: AdmZip,
  dashboardEntry: AdmZip.IZipEntry
): Promise<ContentPackSavedObject[]> {
  assertUncompressedSize(dashboardEntry);

  const dashboard = JSON.parse(
    (await readEntry(dashboardEntry)).toString()
  ) as ContentPackDashboard;

  const uniqReferences = uniqBy(dashboard.references, (ref) => ref.id);
  if (uniqReferences.some(({ type }) => !isSupportedReferenceType(type))) {
    throw new InvalidContentPackError(
      `Dashboard [${
        dashboard.id
      }] references saved object types not supported by content packs: ${uniqReferences.filter(
        ({ type }) => !isSupportedReferenceType(type)
      )}`
    );
  }

  const includedReferences = compact(
    (uniqReferences as Array<{ type: SupportedSavedObjectType; id: string }>).map((ref) =>
      zip.getEntry(path.join('kibana', SUPPORTED_SAVED_OBJECT_TYPE[ref.type], `${ref.id}.json`))
    )
  );

  includedReferences.forEach((entry) => assertUncompressedSize(entry));

  const resolvedReferences = await Promise.all(
    includedReferences.map(
      async (entry) => JSON.parse((await readEntry(entry)).toString()) as ContentPackSavedObject
    )
  );

  return [dashboard, ...resolvedReferences];
}

function assertUncompressedSize(entry: AdmZip.IZipEntry) {
  if (entry.header.size > ARCHIVE_ENTRY_MAX_SIZE_BYTES) {
    throw new InvalidContentPackError(
      `Object [${entry.entryName}] exceeds the limit of ${ARCHIVE_ENTRY_MAX_SIZE_BYTES} bytes`
    );
  }
}
