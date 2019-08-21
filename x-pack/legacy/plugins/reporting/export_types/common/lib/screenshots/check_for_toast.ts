/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { ElementHandle } from 'puppeteer';
import { HeadlessChromiumDriver as HeadlessBrowser } from '../../../../server/browsers/chromium/driver';
import { LevelLogger as Logger } from '../../../../server/lib/level_logger';
import { LayoutInstance } from '../../layouts/layout';

export const checkForToastMessage = async (
  browser: HeadlessBrowser,
  layout: LayoutInstance,
  logger: Logger
): Promise<ElementHandle<Element>> => {
  return await browser
    .waitForSelector(layout.selectors.toastHeader, { silent: true })
    .then(async () => {
      // Check for a toast message on the page. If there is one, capture the
      // message and throw an error, to fail the screenshot.
      const toastHeaderText: string = await browser.evaluate({
        fn: selector => {
          const nodeList = document.querySelectorAll(selector);
          return nodeList.item(0).innerText;
        },
        args: [layout.selectors.toastHeader],
      });

      // Log an error to track the event in kibana server logs
      logger.error(
        i18n.translate(
          'xpack.reporting.exportTypes.printablePdf.screenshots.unexpectedErrorMessage',
          {
            defaultMessage: 'Encountered an unexpected message on the page: {toastHeaderText}',
            values: { toastHeaderText },
          }
        )
      );

      // Throw an error to fail the screenshot job with a message
      throw new Error(
        i18n.translate(
          'xpack.reporting.exportTypes.printablePdf.screenshots.unexpectedErrorMessage',
          {
            defaultMessage: 'Encountered an unexpected message on the page: {toastHeaderText}',
            values: { toastHeaderText },
          }
        )
      );
    });
};
