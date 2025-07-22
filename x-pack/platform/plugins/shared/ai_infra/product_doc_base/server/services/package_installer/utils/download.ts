/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type ReadStream, createReadStream, createWriteStream } from 'fs';
import { mkdir } from 'fs/promises';
import Path from 'path';
import fetch from 'node-fetch';
import { resolveLocalArtifactsPath } from './local_artifacts';

export const downloadToDisk = async (fileUrl: string, filePath: string) => {
  const dirPath = Path.dirname(filePath);
  await mkdir(dirPath, { recursive: true });
  const writeStream = createWriteStream(filePath);
  let readStream: ReadStream | NodeJS.ReadableStream;

  const parsedUrl = new URL(fileUrl);

  if (parsedUrl.protocol === 'file:') {
    const path = resolveLocalArtifactsPath(parsedUrl);
    readStream = createReadStream(path);
  } else {
    const res = await fetch(fileUrl);

    readStream = res.body;
  }

  await new Promise((resolve, reject) => {
    readStream.pipe(writeStream);
    readStream.on('error', reject);
    writeStream.on('finish', resolve);
  });
};
