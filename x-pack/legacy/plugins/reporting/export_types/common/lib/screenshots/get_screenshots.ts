/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { HeadlessChromiumDriver as HeadlessBrowser } from '../../../../server/browsers';
import { LevelLogger } from '../../../../server/lib';
import { Screenshot, ElementsPositionAndAttribute } from './types';

const getAsyncDurationLogger = (logger: LevelLogger) => {
  return async (description: string, promise: Promise<any>) => {
    const start = Date.now();
    const result = await promise;
    logger.debug(
      i18n.translate('xpack.reporting.screencapture.asyncTook', {
        defaultMessage: '{description} took {took}ms',
        values: {
          description,
          took: Date.now() - start,
        },
      })
    );
    return result;
  };
};

export const getScreenshots = async (
  browser: HeadlessBrowser,
  elementsPositionAndAttributes: ElementsPositionAndAttribute[],
  logger: LevelLogger
): Promise<Screenshot[]> => {
  logger.info(
    i18n.translate('xpack.reporting.screencapture.takingScreenshots', {
      defaultMessage: `taking screenshots`,
    })
  );

  const asyncDurationLogger = getAsyncDurationLogger(logger);
  const screenshots: Screenshot[] = [];

  for (let i = 0; i < elementsPositionAndAttributes.length; i++) {
    const item = elementsPositionAndAttributes[i];
    const base64EncodedData = await asyncDurationLogger(
      `screenshot #${i + 1}`,
      browser.screenshot(item.position)
    );

    screenshots.push({
      base64EncodedData,
      title: item.attributes.title,
      description: item.attributes.description,
    });
  }

  logger.info(
    i18n.translate('xpack.reporting.screencapture.screenshotsTaken', {
      defaultMessage: `screenshots taken: {numScreenhots}`,
      values: {
        numScreenhots: screenshots.length,
      },
    })
  );

  return screenshots;
};
