/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compact } from 'lodash';
import { ContentPackEntry } from '@kbn/content-packs-schema';
import * as zip from '@zip.js/zip.js';

export async function readArchiveObjects(reader: zip.ZipReader<any>) {
  const objects = await Promise.all(
    (
      await reader.getEntries()
    ).map(async (entry) => {
      if (entry.filename.slice(-5) === '.json') {
        const raw = await entry.getData?.(new zip.TextWriter());
        if (!raw) return;

        const content = JSON.parse(raw);
        if (content.type === 'dashboard') {
          return content as ContentPackEntry;
        }
      }
    })
  );

  return compact(objects);
}
