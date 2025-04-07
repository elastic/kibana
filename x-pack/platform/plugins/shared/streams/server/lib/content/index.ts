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
  contentPackManifestSchema,
} from '@kbn/streams-schema';
import AdmZip from 'adm-zip';
import { compact } from 'lodash';
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

  const manifestFile = zip.getEntry('manifest.yml');
  if (!manifestFile) {
    throw new Error('Missing content pack manifest');
  }

  const { data: manifestData, success } = contentPackManifestSchema.safeParse(
    YAML.parse(manifestFile.getData().toString())
  );
  if (!success) {
    throw new Error('Invalid content pack manifest format');
  }

  const entries = compact(
    zip.getEntries().map((entry) => {
      if (path.dirname(entry.entryName) === 'kibana/dashboard') {
        const data: ContentPackDashboard = JSON.parse(entry.getData().toString());
        return data;
      }
    })
  );

  return { ...manifestData, entries };
}

export async function generateArchive(manifest: ContentPackManifest, readStream: Readable) {
  const zip = new AdmZip();
  const objects: any[] = await createPromiseFromStreams([readStream, createConcatStream([])]);

  objects.forEach((object: ContentPackEntry) => {
    if (object.type === 'dashboard') {
      zip.addFile(
        `kibana/dashboard/${object.id}.json`,
        Buffer.from(JSON.stringify(object, null, 2))
      );
    }
  });

  zip.addFile('manifest.yml', Buffer.from(YAML.stringify(manifest)));

  return zip.toBuffer();
}
