/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import getosSync from 'getos';
import { promisify } from 'util';

const getos = promisify(getosSync);

export async function logConfiguration(config, logger) {
  const browserType = config.get('xpack.reporting.capture.browser.type');
  logger.debug(`Browser type: ${browserType}`);

  if (browserType === 'chromium') {
    logger.debug(
      `Chromium sandbox disabled: ${config.get(
        'xpack.reporting.capture.browser.chromium.disableSandbox'
      )}`
    );
  }

  const os = await getos();
  logger.debug(`Running on os "${os.os}", distribution "${os.dist}", release "${os.release}"`);
}
