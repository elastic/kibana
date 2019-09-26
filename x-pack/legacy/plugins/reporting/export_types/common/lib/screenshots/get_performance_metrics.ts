/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HeadlessChromiumDriver as HeadlessBrowser } from '../../../../server/browsers/chromium/driver';
import { LevelLogger } from '../../../../server/lib';
import { PerformanceMetrics } from './types';

export const getPerformanceMetrics = async (
  browser: HeadlessBrowser,
  logger: LevelLogger
): Promise<PerformanceMetrics | null> => {
  logger.debug('getting performance metrics');
  return await browser.getMetrics();
};
