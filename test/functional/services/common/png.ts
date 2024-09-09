/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dirname } from 'path';
import { promisify } from 'util';
import { promises as fs, writeFile, readFileSync, mkdir } from 'fs';
import path from 'path';
import { comparePngs, PngDescriptor } from '../lib/compare_pngs';
import { FtrProviderContext, FtrService } from '../../ftr_provider_context';

const mkdirAsync = promisify(mkdir);
const writeFileAsync = promisify(writeFile);

export class PngService extends FtrService {
  private readonly log = this.ctx.getService('log');

  constructor(ctx: FtrProviderContext) {
    super(ctx);
  }

  async comparePngs(
    sessionInfo: string | PngDescriptor,
    baselineInfo: string | PngDescriptor,
    diffPath: string,
    sessionDirectory: string
  ) {
    return await comparePngs(sessionInfo, baselineInfo, diffPath, sessionDirectory, this.log);
  }

  async checkIfPngsMatch(actualpngPath: string, baselinepngPath: string, folder: string) {
    this.log.debug(`checkIfpngsMatch: ${actualpngPath} vs ${baselinepngPath}`);
    // Copy the pngs into the session directory, as that's where the generated pngs will automatically be
    // stored.
    const sessionDirectoryPath = path.resolve(folder, 'session');
    const failureDirectoryPath = path.resolve(folder, 'failure');

    await fs.mkdir(sessionDirectoryPath, { recursive: true });
    await fs.mkdir(failureDirectoryPath, { recursive: true });

    const actualpngFileName = path.basename(actualpngPath, '.png');
    const baselinepngFileName = path.basename(baselinepngPath, '.png');

    const baselineCopyPath = path.resolve(
      sessionDirectoryPath,
      `${baselinepngFileName}_baseline.png`
    );
    const actualCopyPath = path.resolve(sessionDirectoryPath, `${actualpngFileName}_actual.png`);

    // Don't cause a test failure if the baseline snapshot doesn't exist - we don't have all OS's covered and we
    // don't want to start causing failures for other devs working on OS's which are lacking snapshots.  We have
    // mac and linux covered which is better than nothing for now.
    try {
      this.log.debug(`writeFile: ${baselineCopyPath}`);
      await fs.writeFile(baselineCopyPath, await fs.readFile(baselinepngPath));
    } catch (error) {
      throw new Error(`No baseline png found at ${baselinepngPath}`);
    }
    this.log.debug(`writeFile: ${actualCopyPath}`);
    await fs.writeFile(actualCopyPath, await fs.readFile(actualpngPath));

    let diffTotal = 0;

    const diffPngPath = path.resolve(failureDirectoryPath, `${baselinepngFileName}-${1}.png`);
    diffTotal += await this.comparePngs(
      actualCopyPath,
      baselineCopyPath,
      diffPngPath,
      sessionDirectoryPath
    );

    return diffTotal;
  }

  async compareAgainstBaseline(
    sessionPath: string,
    baselinePath: string,
    folder: string,
    updateBaselines: boolean
  ) {
    this.log.debug(`compareAgainstBaseline: ${sessionPath} vs ${baselinePath}`);

    if (updateBaselines) {
      this.log.debug('Updating baseline PNG');
      await mkdirAsync(dirname(baselinePath), { recursive: true });
      await writeFileAsync(baselinePath, readFileSync(sessionPath));
      return 0;
    } else {
      return await this.checkIfPngsMatch(sessionPath, baselinePath, folder);
    }
  }
}
