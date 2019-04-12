/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExtractError } from './extract_error';
import fs from 'fs';
import tar from 'tar-fs';
import unbzip2 from 'unbzip2-stream';

export function bunzip2(filepath, target) {
  return new Promise(function (resolve, reject) {
    fs.createReadStream(filepath)
      .on('error', function (err) {
        reject(new ExtractError(err));
      })
      .pipe(unbzip2())
      .on('error', function (err) {
        reject(new ExtractError(err));
      })
      .pipe(tar.extract(target))
      .on('error', function (err) {
        reject(new ExtractError(err));
      })
      .on('finish', resolve);
  });
}
