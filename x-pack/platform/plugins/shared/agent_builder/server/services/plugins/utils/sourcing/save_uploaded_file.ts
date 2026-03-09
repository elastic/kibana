/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { randomUUID } from 'crypto';
import { createWriteStream, deleteFile, getSafePath } from '@kbn/fs';

const VOLUME = 'agent_builder';

/**
 * Saves an uploaded file stream to a temporary location in the Kibana data folder.
 *
 * Returns the full path to the saved file and a cleanup function
 * that removes the temporary file when called.
 */
export const saveUploadedFile = async (
  stream: Readable
): Promise<{ filePath: string; cleanup: () => Promise<void> }> => {
  const fileName = `tmp/${randomUUID()}.zip`;
  const { fullPath } = getSafePath(fileName, VOLUME);
  const writeStream = createWriteStream(fileName, VOLUME);
  await pipeline(stream, writeStream);
  return {
    filePath: fullPath,
    cleanup: () => deleteFile(fileName, { volume: VOLUME }).catch(() => {}),
  };
};
