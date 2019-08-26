/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { CheckDiskSpaceResult } from 'check-disk-space';

import { Logger } from './log';
import { ServerOptions } from './server_options';

export const DEFAULT_WATERMARK_LOW_PERCENTAGE = 90;

export type DiskCheckResult = CheckDiskSpaceResult;
export type DiskSpaceChecker = (path: string) => Promise<DiskCheckResult>;

export class DiskWatermarkService {
  // True for percentage mode (e.g. 90%), false for absolute mode (e.g. 500mb)
  private percentageMode: boolean = true;
  private watermark: number = DEFAULT_WATERMARK_LOW_PERCENTAGE;
  private enabled: boolean = false;

  constructor(
    private readonly diskSpaceChecker: DiskSpaceChecker,
    private readonly serverOptions: ServerOptions,
    private readonly logger: Logger
  ) {
    this.enabled = this.serverOptions.disk.thresholdEnabled;
    if (this.enabled) {
      this.parseWatermarkConfigString(this.serverOptions.disk.watermarkLow);
    }
  }

  public async isLowWatermark(): Promise<boolean> {
    if (!this.enabled) {
      return false;
    }

    try {
      const res = await this.diskSpaceChecker(this.serverOptions.repoPath);
      const { free, size } = res;
      if (this.percentageMode) {
        const percentage = ((size - free) * 100) / size;
        return percentage > this.watermark;
      } else {
        return free <= this.watermark;
      }
    } catch (err) {
      return true;
    }
  }

  public diskWatermarkViolationMessage(): string {
    if (this.percentageMode) {
      return i18n.translate('xpack.code.git.diskWatermarkLowPercentageMessage', {
        defaultMessage: `Disk usage watermark level higher than {watermark}`,
        values: {
          watermark: this.serverOptions.disk.watermarkLow,
        },
      });
    } else {
      return i18n.translate('xpack.code.git.diskWatermarkLowMessage', {
        defaultMessage: `Available disk space lower than {watermark}`,
        values: {
          watermark: this.serverOptions.disk.watermarkLow,
        },
      });
    }
  }

  private parseWatermarkConfigString(diskWatermarkLow: string) {
    // Including undefined, null and empty string.
    if (!diskWatermarkLow) {
      this.logger.error(
        `Empty disk watermark config for Code. Fallback with default value (${DEFAULT_WATERMARK_LOW_PERCENTAGE}%)`
      );
      return;
    }

    try {
      const str = diskWatermarkLow.trim().toLowerCase();
      if (str.endsWith('%')) {
        this.percentageMode = true;
        this.watermark = parseInt(str.substr(0, str.length - 1), 10);
      } else if (str.endsWith('kb')) {
        this.percentageMode = false;
        this.watermark = parseInt(str.substr(0, str.length - 2), 10) * Math.pow(1024, 1);
      } else if (str.endsWith('mb')) {
        this.percentageMode = false;
        this.watermark = parseInt(str.substr(0, str.length - 2), 10) * Math.pow(1024, 2);
      } else if (str.endsWith('gb')) {
        this.percentageMode = false;
        this.watermark = parseInt(str.substr(0, str.length - 2), 10) * Math.pow(1024, 3);
      } else if (str.endsWith('tb')) {
        this.percentageMode = false;
        this.watermark = parseInt(str.substr(0, str.length - 2), 10) * Math.pow(1024, 4);
      } else {
        throw new Error('Unrecognized unit for disk size config.');
      }
    } catch (error) {
      this.logger.error(
        `Invalid disk watermark config for Code. Fallback with default value (${DEFAULT_WATERMARK_LOW_PERCENTAGE}%)`
      );
    }
  }
}
