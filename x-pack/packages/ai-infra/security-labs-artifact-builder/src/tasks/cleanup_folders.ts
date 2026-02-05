/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs/promises';

/**
 * Removes the specified folders (used for cleanup of temporary build files).
 */
export const cleanupFolders = async ({ folders }: { folders: string[] }) => {
  for (const folder of folders) {
    try {
      await Fs.rm(folder, { recursive: true, force: true });
    } catch {
      // Ignore errors if folder doesn't exist
    }
  }
};
