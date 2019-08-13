/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HeadlessChromiumDriver as HeadlessBrowser } from '../../../../server/browsers/chromium/driver';
import { LevelLogger as Logger } from '../../../../server/lib/level_logger';
import { LayoutInstance } from '../../layouts/layout';

export const getNumberOfItems = async (
  browser: HeadlessBrowser,
  layout: LayoutInstance,
  logger: Logger
): Promise<number> => {
  logger.debug('determining how many items we have');

  // returns the value of the `itemsCountAttribute` if it's there, otherwise
  // we just count the number of `itemSelector`
  const itemsCount: number = await browser.evaluate({
    fn: (selector, countAttribute) => {
      const elementWithCount = document.querySelector(`[${countAttribute}]`);
      if (elementWithCount && elementWithCount != null) {
        const count = elementWithCount.getAttribute(countAttribute);
        if (count && count != null) {
          return parseInt(count, 10);
        }
      }

      return document.querySelectorAll(selector).length;
    },
    args: [layout.selectors.renderComplete, layout.selectors.itemsCountAttribute],
  });

  return itemsCount;
};
