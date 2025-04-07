/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import YAML from 'yaml';
import {
  ContentPack,
  ContentPackEntry,
  ContentPackManifest,
  contentPackManifestSchema,
} from '@kbn/streams-schema';
import AdmZip from 'adm-zip';
import path from 'path';
import { Readable } from 'stream';
import { createConcatStream, createPromiseFromStreams } from '@kbn/utils';

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

  let manifestEntry: AdmZip.IZipEntry | undefined;
  const entries: ContentPackEntry[] = [];
  zip.forEach((entry) => {
    const filepath = path.join(...entry.entryName.split(path.sep).slice(1));
    if (filepath === 'manifest.yml') {
      manifestEntry = entry;
    }

    if (path.dirname(filepath) === path.join('kibana', 'dashboard')) {
      entries.push(JSON.parse(entry.getData().toString()));
    }
  });

  if (!manifestEntry) {
    throw new Error('Missing content pack manifest');
  }

  const { data: manifestData, success } = contentPackManifestSchema.safeParse(
    YAML.parse(manifestEntry.getData().toString())
  );
  if (!success) {
    throw new Error('Invalid content pack manifest format');
  }

  return { ...manifestData, entries };
}

export async function generateArchive(manifest: ContentPackManifest, readStream: Readable) {
  const zip = new AdmZip();
  const rootDir = `${manifest.name}-${manifest.version}`;
  const objects: any[] = await createPromiseFromStreams([readStream, createConcatStream([])]);

  objects.forEach((object: ContentPackEntry) => {
    if (object.type === 'dashboard') {
      zip.addFile(
        path.join(rootDir, 'kibana', 'dashboard', `${object.id}.json`),
        Buffer.from(JSON.stringify(object, null, 2))
      );
    }
  });

  zip.addFile(path.join(rootDir, 'manifest.yml'), Buffer.from(YAML.stringify(manifest)));

  return zip.toBuffer();
}
