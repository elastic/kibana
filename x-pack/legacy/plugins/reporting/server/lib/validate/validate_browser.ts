/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Browser } from 'puppeteer';
import { KbnServer, Logger } from '../../../types';
import { CHROMIUM } from '../../browsers/browser_types';
import { HeadlessChromiumDriverFactory } from '../../browsers/chromium/driver_factory';

/*
 * Validate the Reporting headless browser can launch, and that it can connect
 * to the locally running Kibana instance.
 */
export const validateBrowser = async (
  server: KbnServer,
  browserFactory: HeadlessChromiumDriverFactory,
  logger: Logger
) => {
  if (browserFactory.type === CHROMIUM) {
    return browserFactory
      .test({ viewport: { width: 800, height: 600 } }, logger)
      .then((browser: Browser | null) => {
        if (browser && browser.close) {
          browser.close();
        } else {
          throw new Error('Could not close browser client handle!');
        }
      });
  }
};
