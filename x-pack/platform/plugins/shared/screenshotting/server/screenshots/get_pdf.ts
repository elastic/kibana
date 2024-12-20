/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Actions, EventLogger } from './event_logger';
import type { HeadlessChromiumDriver } from '../browsers';
import type { Screenshot } from './types';

export async function getPdf(
  browser: HeadlessChromiumDriver,
  logger: EventLogger,
  title: string,
  options?: {
    error?: Error;
    logo?: string;
  }
): Promise<Screenshot[]> {
  logger.kbnLogger.info('printing PDF');

  const spanEnd = logger.logPdfEvent('printing A4 PDF', Actions.PRINT_A4_PDF, 'output');

  const result = [
    {
      data: await browser.printA4Pdf({ title, ...options }),
      title: null,
      description: null,
    },
  ];

  spanEnd();

  return result;
}
