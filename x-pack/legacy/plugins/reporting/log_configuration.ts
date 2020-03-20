/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import getosSync, { LinuxOs } from 'getos';
import { promisify } from 'util';
import { BROWSER_TYPE } from './common/constants';
import { CaptureConfig } from './server/types';
import { Logger } from './types';

const getos = promisify(getosSync);

export async function logConfiguration(captureConfig: CaptureConfig, logger: Logger) {
  const {
    browser: {
      type: browserType,
      chromium: { disableSandbox },
    },
  } = captureConfig;

  logger.debug(`Browser type: ${browserType}`);
  if (browserType === BROWSER_TYPE) {
    logger.debug(`Chromium sandbox disabled: ${disableSandbox}`);
  }

  const os = await getos();
  const { os: osName, dist, release } = os as LinuxOs;
  if (dist) {
    logger.debug(`Running on os "${osName}", distribution "${dist}", release "${release}"`);
  } else {
    logger.debug(`Running on os "${osName}"`);
  }
}
