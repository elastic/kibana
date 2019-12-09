/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import getosSync, { LinuxOs } from 'getos';
import { promisify } from 'util';
import { ServerFacade, Logger } from './types';

const getos = promisify(getosSync);

export async function logConfiguration(server: ServerFacade, logger: Logger) {
  const config = server.config();

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
  const { os: osName, dist, release } = os as LinuxOs;
  if (dist) {
    logger.debug(`Running on os "${osName}", distribution "${dist}", release "${release}"`);
  } else {
    logger.debug(`Running on os "${osName}"`);
  }
}
