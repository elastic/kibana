/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HeadlessChromiumDriver as HeadlessBrowser } from '../../../../server/browsers';
import { LevelLogger } from '../../../../server/lib';
import { ServerFacade } from '../../../../types';
import { LayoutInstance } from '../../layouts/layout';
import { CONTEXT_GETNUMBEROFITEMS, CONTEXT_READMETADATA } from './constants';

export const getNumberOfItems = async (
  server: ServerFacade,
  browser: HeadlessBrowser,
  layout: LayoutInstance,
  logger: LevelLogger
): Promise<number> => {
  const config = server.config();
  const { renderComplete: renderCompleteSelector, itemsCountAttribute } = layout.selectors;
  let itemsCount: number;

  logger.debug('determining how many rendered items to wait for');
  try {
    // the dashboard is using the `itemsCountAttribute` attribute to let us
    // know how many items to expect since gridster incrementally adds panels
    // we have to use this hint to wait for all of them
    await browser.waitForSelector(
      `${renderCompleteSelector},[${itemsCountAttribute}]`,
      { timeout: config.get('xpack.reporting.capture.timeouts.waitForElements') },
      { context: CONTEXT_READMETADATA },
      logger
    );

    // returns the value of the `itemsCountAttribute` if it's there, otherwise
    // we just count the number of `itemSelector`: the number of items already rendered
    itemsCount = await browser.evaluate(
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
        args: [renderCompleteSelector, itemsCountAttribute],
      },
      { context: CONTEXT_GETNUMBEROFITEMS },
      logger
    );
  } catch (err) {
    throw new Error(
      'An error occurred when trying to read the page for visualizations metadata. ' + err
    );
    itemsCount = 1;
  }

  return itemsCount;
};
