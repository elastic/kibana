/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ReportingConfig } from '../';
import { LevelLogger } from '../lib';
import { HeadlessChromiumDriverFactory } from './chromium/driver_factory';
import { ensureBrowserDownloaded } from './download';
import { chromium } from './index';
import { installBrowser } from './install';

export async function createBrowserDriverFactory(
  config: ReportingConfig,
  logger: LevelLogger
): Promise<HeadlessChromiumDriverFactory> {
  const captureConfig = config.get('capture');
  const browserConfig = captureConfig.browser.chromium;
  const browserAutoDownload = captureConfig.browser.autoDownload;
  const browserType = captureConfig.browser.type;
  const dataDir = config.kbnConfig.get('path', 'data');

  if (browserConfig.disableSandbox) {
    logger.warning(`Enabling the Chromium sandbox provides an additional layer of protection.`);
  }
  if (browserAutoDownload) {
    await ensureBrowserDownloaded(browserType);
  }

  try {
    const { binaryPath } = await installBrowser(logger, chromium, dataDir);
    return chromium.createDriverFactory(binaryPath, logger, captureConfig);
  } catch (error) {
    if (error.cause && ['EACCES', 'EEXIST'].includes(error.cause.code)) {
      logger.error(
        `Error code ${error.cause.code}: Insufficient permissions for extracting the browser archive. ` +
          `Make sure the Kibana data directory (path.data) is owned by the same user that is running Kibana.`
      );
    }

    throw error; // reject the promise with the original error
  }
}
