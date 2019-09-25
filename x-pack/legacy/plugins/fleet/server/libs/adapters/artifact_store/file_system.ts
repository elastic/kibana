/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import fs from 'fs';
import { promisify } from 'util';
import path from 'path';
import mkdirp from 'mkdirp';
import { ArtifactStore } from './adapter_type';

const existsAsync = promisify(fs.exists);
const unlinkAsync = promisify(fs.unlink);
const mkdirpAsync = promisify(mkdirp);

/**
 * File system artifact store
 */
export class FileSystemArtifactStore implements ArtifactStore {
  constructor(private readonly cacheDirectory: string) {}
  public async has(key: string): Promise<boolean> {
    return await existsAsync(this.getPathForKey(key));
  }

  public getCacheStream(key: string) {
    return fs.createReadStream(this.getPathForKey(key));
  }

  public async setCacheStream(key: string) {
    const filePath = this.getPathForKey(key);
    await mkdirpAsync(path.dirname(filePath));
    return fs.createWriteStream(filePath);
  }

  public async deleteCache(key: string) {
    return unlinkAsync(this.getPathForKey(key));
  }

  private getPathForKey(key: string) {
    const filePath = path.normalize(path.join(this.cacheDirectory, key));
    if (!filePath.startsWith(this.cacheDirectory)) {
      throw new Error('Path for this file is outside cache directory');
    }
    return filePath;
  }
}
