/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HeadlessChromiumDriver as HeadlessBrowser } from '../../../../server/browsers/chromium/driver';
import { LevelLogger } from '../../../../server/lib';
import { LayoutInstance } from '../../layouts/layout';
import { TimeRange } from './types';

export const getTimeRange = async (
  browser: HeadlessBrowser,
  layout: LayoutInstance,
  logger: LevelLogger
): Promise<TimeRange | null> => {
  logger.debug('getting timeRange');

  const timeRange: TimeRange | null = await browser.evaluate({
    fn: durationAttribute => {
      const durationElement = document.querySelector(`[${durationAttribute}]`);

      if (!durationElement) {
        return null;
      }

      const duration = durationElement.getAttribute(durationAttribute);
      if (!duration) {
        return null;
      }

      return { duration };
    },
    args: [layout.selectors.timefilterDurationAttribute],
  });

  if (timeRange) {
    logger.info(`timeRange: ${timeRange.duration}`);
  } else {
    logger.debug('no timeRange');
  }

  return timeRange;
};
