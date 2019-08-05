/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { LevelLogger as Logger } from '../../../../server/lib';
import { HeadlessChromiumDriver as HeadlessBrowser } from '../../../../server/browsers/chromium/driver';
import { LayoutInstance } from '../../layouts/layout';

export const checkForToastMessage = async (
  browser: HeadlessBrowser,
  layout: LayoutInstance,
  logger: Logger
): Promise<void> => {
  await browser.waitForSelector(layout.selectors.toastHeader, { silent: true }, logger);
  const toastHeaderText = await browser.evaluate({
    fn: selector => {
      const nodeList = document.querySelectorAll(selector);
      return nodeList.item(0).innerText;
    },
    args: [layout.selectors.toastHeader],
  });
  throw new Error(
    i18n.translate('xpack.reporting.exportTypes.printablePdf.screenshots.unexpectedErrorMessage', {
      defaultMessage: 'Encountered an unexpected message on the page: {toastHeaderText}',
      values: { toastHeaderText },
    })
  );
};
