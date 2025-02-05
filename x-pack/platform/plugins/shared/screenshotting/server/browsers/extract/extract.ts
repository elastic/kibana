/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import { unzip } from './unzip';
import { ExtractError } from './extract_error';

export async function extract(archivePath: string, targetPath: string) {
  const fileType = path.parse(archivePath).ext.substr(1);
  let unpacker;

  switch (fileType) {
    case 'zip':
      unpacker = unzip;
      break;
    default:
      throw new ExtractError(new Error(`Unable to unpack filetype: ${fileType}`));
  }

  await unpacker(archivePath, targetPath);
}
