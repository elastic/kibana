/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createWriteStream } from 'fs';
import { mkdir } from 'fs/promises';
import Path from 'path';
import fetch from 'node-fetch';

export const downloadToDisk = async (fileUrl: string, filePath: string) => {
  const dirPath = Path.dirname(filePath);
  await mkdir(dirPath, { recursive: true });
  const res = await fetch(fileUrl);
  const fileStream = createWriteStream(filePath);
  await new Promise((resolve, reject) => {
    res.body.pipe(fileStream);
    res.body.on('error', reject);
    fileStream.on('finish', resolve);
  });
};
