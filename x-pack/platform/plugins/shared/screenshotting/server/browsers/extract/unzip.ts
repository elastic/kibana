/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import AdmZip from 'adm-zip';
import path from 'node:path';
import { ExtractError } from './extract_error';

const checkTargetDestination = (origin: string, target: string) => {
  if (target !== origin && !target.startsWith(`${origin}${path.sep}`)) {
    throw new Error(`Path traversal attempt: "${target}" escapes "${origin}"`);
  }
};

export async function unzip(filepath: string, target: string) {
  try {
    const zip = new AdmZip(filepath);
    const origin = path.resolve(target);

    for (const entry of zip.getEntries()) {
      const fullPath = path.join(origin, entry.entryName);
      checkTargetDestination(origin, fullPath);
      zip.extractEntryTo(
        entry,
        origin,
        /* maintainEntryPath */ true,
        /* overwrite */ true,
        /* keepOriginalPermission */ true
      );
    }
  } catch (err) {
    throw new ExtractError(err);
  }
}
