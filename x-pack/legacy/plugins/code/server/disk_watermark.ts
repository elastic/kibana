/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import checkDiskSpace from 'check-disk-space';

export class DiskWatermarkService {
  constructor(private readonly diskWatermarkLowMb: number, private readonly repoPath: string) {}

  public async isLowWatermark(): Promise<boolean> {
    try {
      const { free } = await checkDiskSpace(this.repoPath);
      const availableMb = free / 1024 / 1024;
      return availableMb <= this.diskWatermarkLowMb;
    } catch (err) {
      return true;
    }
  }
}
