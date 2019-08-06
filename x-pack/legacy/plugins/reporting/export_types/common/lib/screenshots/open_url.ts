/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LevelLogger as Logger } from '../../../../server/lib/level_logger';
import { HeadlessChromiumDriver as HeadlessBrowser } from '../../../../server/browsers/chromium/driver';
import { WAITFOR_SELECTOR } from '../../constants';

export const openUrl = async (
  browser: HeadlessBrowser,
  url: string,
  conditionalHeaders: any,
  logger: Logger
): Promise<void> => {
  logger.debug(`opening ${url}`);

  await browser.open(url, {
    conditionalHeaders,
    waitForSelector: WAITFOR_SELECTOR,
  });
};
