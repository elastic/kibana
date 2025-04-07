/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import YAML from 'yaml';
import { ContentPack, ContentPackDashboard, contentPackManifestSchema } from '@kbn/streams-schema';
import AdmZip from 'adm-zip';
import { compact } from 'lodash';
import path from 'path';
import { Readable } from 'stream';

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
