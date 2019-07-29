/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import checkDiskSpace from 'check-disk-space';

import { DiskWatermarkOptions } from './server_options';

export enum DiskWatermarkLevel {
  NORMAL = 'normal',
  LOW = 'low',
  HIGH = 'high',
  FLOOD_STAGE = 'floodstage',
  UNKNOWN = 'unknown',
}

export class DiskWatermarkService {
  constructor(
    private readonly diskWatermarkOptions: DiskWatermarkOptions,
    private readonly repoPath: string
  ) {}

  public async detect(): Promise<DiskWatermarkLevel> {
    try {
      const { free } = await checkDiskSpace(this.repoPath);
      const availableMb = free / 1024 / 1024;
      if (availableMb <= this.diskWatermarkOptions.floodStageMb) {
        return DiskWatermarkLevel.FLOOD_STAGE;
      } else if (availableMb <= this.diskWatermarkOptions.highMb) {
        return DiskWatermarkLevel.HIGH;
      } else if (availableMb <= this.diskWatermarkOptions.lowMb) {
        return DiskWatermarkLevel.LOW;
      }
      return DiskWatermarkLevel.NORMAL;
    } catch (err) {
      return DiskWatermarkLevel.UNKNOWN;
    }
  }
}
