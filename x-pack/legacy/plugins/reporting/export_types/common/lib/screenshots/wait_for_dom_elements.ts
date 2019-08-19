/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HeadlessChromiumDriver as HeadlessBrowser } from '../../../../server/browsers/chromium/driver';
import { LevelLogger as Logger } from '../../../../server/lib';
import { LayoutInstance } from '../../layouts/layout';

export const waitForElementsToBeInDOM = async (
  browser: HeadlessBrowser,
  itemsCount: number,
  layout: LayoutInstance,
  logger: Logger
): Promise<number> => {
  logger.debug(`waiting for ${itemsCount} rendered elements to be in the DOM`);

  await browser.waitFor({
    fn: selector => {
      return document.querySelectorAll(selector).length;
    },
    args: [layout.selectors.renderComplete],
    toEqual: itemsCount,
  });

  logger.info(`found ${itemsCount} rendered elements in the DOM`);
  return itemsCount;
};
