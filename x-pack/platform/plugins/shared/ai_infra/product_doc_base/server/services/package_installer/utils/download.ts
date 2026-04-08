/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type ReadStream, createReadStream } from 'fs';
import fetch from 'node-fetch';
import { createWriteStream, getSafePath } from '@kbn/fs';
import { pipeline } from 'stream/promises';
import { resolveLocalArtifactsPath } from './local_artifacts';

export const downloadToDisk = async (
  fileUrl: string,
  filePathAtVolume: string
): Promise<string> => {
  const { fullPath: artifactFullPath } = getSafePath(filePathAtVolume);
  const writeStream = createWriteStream(filePathAtVolume);
  let readStream: ReadStream;

  const parsedUrl = new URL(fileUrl);

  if (parsedUrl.protocol === 'file:') {
    const path = resolveLocalArtifactsPath(parsedUrl);
    readStream = createReadStream(path);
  } else {
    const res = await fetch(fileUrl);

    readStream = res.body as ReadStream;
  }

  await pipeline(readStream, writeStream);

  return artifactFullPath;
};
