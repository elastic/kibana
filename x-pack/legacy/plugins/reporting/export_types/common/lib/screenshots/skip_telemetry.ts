/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HeadlessChromiumDriver as HeadlessBrowser } from '../../../../server/browsers/chromium/driver';
import { LevelLogger } from '../../../../server/lib';
import { CONTEXT_SKIPTELEMETRY } from './constants';

const LAST_REPORT_STORAGE_KEY = 'xpack.data';

export async function skipTelemetry(browser: HeadlessBrowser, logger: LevelLogger) {
  const storageData = await browser.evaluate(
    {
      fn: storageKey => {
        // set something
        const optOutJSON = JSON.stringify({ lastReport: Date.now() });
        localStorage.setItem(storageKey, optOutJSON);

        // get it
        const session = localStorage.getItem(storageKey);

        // return it
        return session;
      },
      args: [LAST_REPORT_STORAGE_KEY],
    },
    { context: CONTEXT_SKIPTELEMETRY },
    logger
  );

  logger.debug(`added data to localStorage to skip telmetry: ${storageData}`);
}
