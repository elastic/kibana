/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import path from 'path';
import rename from 'gulp-rename';
import vfs from 'vinyl-fs';
import zip from 'gulp-zip';

// we create the zip, but we want all the files to be in a folder, the zipDirectoryName,
// so we have to rename them as such
export function createZip(dir, files, zipDirectoryName, zipPath, zipFilename) {
  return new Promise(function (resolve, reject) {
    vfs.src(files, { cwd: dir, base: dir })
      .pipe(rename(function (filePath) {
        filePath.dirname = path.join(zipDirectoryName, filePath.dirname);
      }))
      .pipe(zip(zipFilename))
      .pipe(vfs.dest(zipPath))
      .on('end', resolve)
      .on('error', reject);
  });
}