/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { BROWSERS_BY_TYPE } from './browsers';
// @ts-ignore
import { ensureBrowserDownloaded } from './download';
import { installBrowser } from './install';
import { LevelLogger } from '../lib/level_logger';
import { KbnServer } from '../../types';
import { PLUGIN_ID } from '../../common/constants';

export async function createBrowserDriverFactory(server: KbnServer) {
  const config = server.config();
  const logger = LevelLogger.createForServer(server, [PLUGIN_ID, 'browser-driver']);

  const DATA_DIR = config.get('path.data');
  const CAPTURE_CONFIG = config.get('xpack.reporting.capture');
  const BROWSER_TYPE = CAPTURE_CONFIG.browser.type;
  const BROWSER_AUTO_DOWNLOAD = CAPTURE_CONFIG.browser.autoDownload;
  const BROWSER_CONFIG = CAPTURE_CONFIG.browser[BROWSER_TYPE];
  const REPORTING_TIMEOUT = config.get('xpack.reporting.queue.timeout');

  if (BROWSER_CONFIG.disableSandbox) {
    logger.warning(`Enabling the Chromium sandbox provides an additional layer of protection.`);
  }
  if (BROWSER_AUTO_DOWNLOAD) {
    await ensureBrowserDownloaded(BROWSER_TYPE);
  }

  try {
    const browser = BROWSERS_BY_TYPE[BROWSER_TYPE]; // NOTE: unecessary indirection: this is always a Chromium browser object, as of PhantomJS removal
    const { binaryPath } = await installBrowser(logger, browser, DATA_DIR);
    return browser.createDriverFactory(binaryPath, logger, BROWSER_CONFIG, REPORTING_TIMEOUT);
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
