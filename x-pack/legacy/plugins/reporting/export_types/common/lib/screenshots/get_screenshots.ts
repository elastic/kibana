/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HeadlessChromiumDriver as HeadlessBrowser } from '../../../../server/browsers';
import { LevelLogger } from '../../../../server/lib';
import { Screenshot, ElementsPositionAndAttribute } from './types';

const getAsyncDurationLogger = (logger: LevelLogger) => {
  return async (description: string, promise: Promise<any>) => {
    const start = Date.now();
    const result = await promise;
    logger.debug(`${description} took ${Date.now() - start}ms`);
    return result;
  };
};

export const getScreenshots = async ({
  browser,
  elementsPositionAndAttributes,
  logger,
}: {
  logger: LevelLogger;
  browser: HeadlessBrowser;
  elementsPositionAndAttributes: ElementsPositionAndAttribute[];
}): Promise<Screenshot[]> => {
  logger.info(`taking screenshots`);

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

  logger.info(`screenshots taken: ${screenshots.length}`);

  return screenshots;
};
