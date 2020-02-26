/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ServerFacade } from '../../../../types';
import { HeadlessChromiumDriver as HeadlessBrowser } from '../../../../server/browsers';
import { LevelLogger } from '../../../../server/lib';
import { LayoutInstance } from '../../layouts/layout';
import { CONTEXT_WAITFORELEMENTSTOBEINDOM } from './constants';

type SelectorArgs = Record<string, string>;

const getCompletedItemsCount = ({ renderCompleteSelector }: SelectorArgs) => {
  return document.querySelectorAll(renderCompleteSelector).length;
};

/*
 * 1. Wait for the visualization metadata to be found in the DOM
 * 2. Read the metadata for the number of visualization items
 * 3. Wait for the render complete event to be fired once for each item
 */
export const waitForVisualizations = async (
  server: ServerFacade,
  browser: HeadlessBrowser,
  itemsCount: number,
  layout: LayoutInstance,
  logger: LevelLogger
): Promise<void> => {
  const config = server.config();
  const { renderComplete: renderCompleteSelector } = layout.selectors;

  logger.info('waiting for elements or items count attribute; or not found to interrupt');
  try {
    // wait for each visualization dom element to fire the render complete event
    logger.info(`waiting for ${itemsCount} rendered elements to be in the DOM`);
    await browser.waitFor(
      {
        fn: getCompletedItemsCount,
        args: [{ renderCompleteSelector }],
        toEqual: itemsCount,
        timeout: config.get('xpack.reporting.capture.timeouts.renderComplete'),
      },
      { context: CONTEXT_WAITFORELEMENTSTOBEINDOM },
      logger
    );

    logger.info(`found ${itemsCount} rendered elements in the DOM`);
  } catch (err) {
    throw new Error(
      'An error occurred when trying to wait for visualizations to finish rendering. ' + err
    );
  }
};
