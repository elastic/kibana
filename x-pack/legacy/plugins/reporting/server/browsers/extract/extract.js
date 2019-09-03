/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import path from 'path';
import { unzip } from './unzip';
import { ExtractError } from './extract_error';

export async function extract(archivePath, targetPath) {
  const fileType = path.parse(archivePath).ext.substr(1);
  let unpacker;

  switch (fileType) {
    case 'zip':
      unpacker = unzip;
      break;
    default:
      throw new ExtractError(`Unable to unpack filetype: ${fileType}`);
  }

  await unpacker(archivePath, targetPath);
}
