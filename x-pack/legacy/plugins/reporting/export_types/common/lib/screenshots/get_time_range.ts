/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HeadlessChromiumDriver as HeadlessBrowser } from '../../../../server/browsers';
import { LevelLogger, startTrace } from '../../../../server/lib';
import { LayoutInstance } from '../../layouts/layout';
import { CONTEXT_GETTIMERANGE } from './constants';
import { TimeRange } from './types';

export const getTimeRange = async (
  browser: HeadlessBrowser,
  layout: LayoutInstance,
  logger: LevelLogger
): Promise<TimeRange | null> => {
  const endTrace = startTrace('get_time_range', 'read');
  logger.debug('getting timeRange');

  const timeRange: TimeRange | null = await browser.evaluate(
    {
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
    },
    { context: CONTEXT_GETTIMERANGE },
    logger
  );

  if (timeRange) {
    logger.info(`timeRange: ${timeRange.duration}`);
  } else {
    logger.debug('no timeRange');
  }

  endTrace();

  return timeRange;
};
