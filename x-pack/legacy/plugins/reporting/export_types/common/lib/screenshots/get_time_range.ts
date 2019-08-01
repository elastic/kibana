/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HeadlessChromiumDriver as HeadlessBrowser } from '../../../../server/browsers/chromium/driver';
import { LevelLogger as Logger } from '../../../../server/lib/level_logger';
import { LayoutInstance } from '../../layouts/layout';
import { TimeRange } from './types';

export const getTimeRange = async (
  browser: HeadlessBrowser,
  layout: LayoutInstance,
  logger: Logger
): Promise<TimeRange | null> => {
  logger.debug('getting timeRange');

  const timeRange: TimeRange | null = await browser.evaluate({
    fn: (fromAttribute, toAttribute) => {
      const fromElement = document.querySelector(`[${fromAttribute}]`);
      const toElement = document.querySelector(`[${toAttribute}]`);

      if (!fromElement || !toElement) {
        return null;
      }

      const from = fromElement.getAttribute(fromAttribute);
      const to = toElement.getAttribute(toAttribute);
      if (!to || !from) {
        return null;
      }

      return { from, to };
    },
    args: [layout.selectors.timefilterFromAttribute, layout.selectors.timefilterToAttribute],
  });

  if (timeRange) {
    logger.debug(`timeRange from ${timeRange.from} to ${timeRange.to}`);
  } else {
    logger.debug('no timeRange');
  }

  return timeRange;
};
