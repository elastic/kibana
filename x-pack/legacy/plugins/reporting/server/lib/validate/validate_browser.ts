/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as puppeteer from 'puppeteer-core';
import { KbnServer, Logger } from '../../../types';
import { CHROMIUM } from '../../browsers/browser_types';

/*
 * Validate the Reporting headless browser can launch, and that it can connect
 * to the locally running Kibana instance.
 */
export const validateBrowser = async (server: KbnServer, browserFactory: any, logger: Logger) => {
  if (browserFactory.type === CHROMIUM) {
    return browserFactory
      .test(
        {
          viewport: { width: 800, height: 600 },
        },
        logger
      )
      .then((browser: puppeteer.Browser | null) => {
        if (browser && browser.close) {
          browser.close();
        } else {
          throw new Error('Could not close browser client handle!');
        }
      });
  }
};
