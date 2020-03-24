/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve as resolvePath } from 'path';
import { existsSync } from 'fs';

import { chromium } from '../index';
import { BrowserDownload, BrowserType } from '../types';

import { md5 } from './checksum';
import { asyncMap } from './util';
import { download } from './download';
import { clean } from './clean';

/**
 * Check for the downloaded archive of each requested browser type and
 * download them if they are missing or their checksum is invalid
 * @param  {String} browserType
 * @return {Promise<undefined>}
 */
export async function ensureBrowserDownloaded(browserType: BrowserType) {
  await ensureDownloaded([chromium]);
}

/**
 * Like ensureBrowserDownloaded(), except it applies to all browsers
 * @return {Promise<undefined>}
 */
export async function ensureAllBrowsersDownloaded() {
  await ensureDownloaded([chromium]);
}

/**
 * Clears the unexpected files in the browsers archivesPath
 * and ensures that all packages/archives are downloaded and
 * that their checksums match the declared value
 * @param  {BrowserSpec} browsers
 * @return {Promise<undefined>}
 */
async function ensureDownloaded(browsers: BrowserDownload[]) {
  await asyncMap(browsers, async browser => {
    const { archivesPath } = browser.paths;

    await clean(
      archivesPath,
      browser.paths.packages.map(p => resolvePath(archivesPath, p.archiveFilename))
    );

    const invalidChecksums: string[] = [];
    await asyncMap(browser.paths.packages, async ({ archiveFilename, archiveChecksum }) => {
      const url = `${browser.paths.baseUrl}${archiveFilename}`;
      const path = resolvePath(archivesPath, archiveFilename);

      if (existsSync(path) && (await md5(path)) === archiveChecksum) {
        return;
      }

      const downloadedChecksum = await download(url, path);
      if (downloadedChecksum !== archiveChecksum) {
        invalidChecksums.push(`${url} => ${path}`);
      }
    });

    if (invalidChecksums.length) {
      throw new Error(
        `Error downloading browsers, checksums incorrect for:\n    - ${invalidChecksums.join(
          '\n    - '
        )}`
      );
    }
  });
}
