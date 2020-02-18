/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HeadlessChromiumDriver as HeadlessBrowser } from '../../../../server/browsers';
import { LevelLogger } from '../../../../server/lib';
import { LayoutInstance } from '../../layouts/layout';
import { CONTEXT_GETNUMBEROFITEMS } from './constants';

export const getNumberOfItems = async (
  browser: HeadlessBrowser,
  layout: LayoutInstance,
  logger: LevelLogger
): Promise<number> => {
  logger.debug('determining how many rendered items to wait for');

  // returns the value of the `itemsCountAttribute` if it's there, otherwise
  // we just count the number of `itemSelector`
  const itemsCount: number = await browser.evaluate(
    {
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
    },
    { context: CONTEXT_GETNUMBEROFITEMS },
    logger
  );

  return itemsCount;
};
