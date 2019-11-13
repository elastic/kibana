/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ensureBrowserDownloaded } from './download';
import { installBrowser } from './install';
import { LevelLogger } from '../lib/level_logger';
import { ServerFacade, CaptureConfig } from '../../types';
import { PLUGIN_ID, BROWSER_TYPE } from '../../common/constants';
import { chromium } from './index';
import { HeadlessChromiumDriverFactory } from './chromium/driver_factory';

export async function createBrowserDriverFactory(
  server: ServerFacade
): Promise<HeadlessChromiumDriverFactory> {
  const config = server.config();
  const logger = LevelLogger.createForServer(server, [PLUGIN_ID, 'browser-driver']);

  const dataDir: string = config.get('path.data');
  const captureConfig: CaptureConfig = config.get('xpack.reporting.capture');
  const browserType = captureConfig.browser.type;
  const browserAutoDownload = captureConfig.browser.autoDownload;
  const browserConfig = captureConfig.browser[BROWSER_TYPE];
  const networkPolicy = captureConfig.networkPolicy;
  const reportingTimeout: number = config.get('xpack.reporting.queue.timeout');

  if (browserConfig.disableSandbox) {
    logger.warning(`Enabling the Chromium sandbox provides an additional layer of protection.`);
  }
  if (browserAutoDownload) {
    await ensureBrowserDownloaded(browserType);
  }

  try {
    const { binaryPath } = await installBrowser(logger, chromium, dataDir);
    return chromium.createDriverFactory(
      binaryPath,
      logger,
      browserConfig,
      reportingTimeout,
      networkPolicy
    );
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
