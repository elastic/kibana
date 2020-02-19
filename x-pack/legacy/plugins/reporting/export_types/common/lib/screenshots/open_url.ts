/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ConditionalHeaders } from '../../../../types';
import { LevelLogger } from '../../../../server/lib';
import { HeadlessChromiumDriver as HeadlessBrowser } from '../../../../server/browsers';
import { WAITFOR_SELECTOR } from '../../constants';

export const openUrl = async (
  browser: HeadlessBrowser,
  url: string,
  conditionalHeaders: ConditionalHeaders,
  logger: LevelLogger
): Promise<void> => {
  await browser.open(
    url,
    {
      conditionalHeaders,
      waitForSelector: WAITFOR_SELECTOR,
    },
    logger
  );
};
