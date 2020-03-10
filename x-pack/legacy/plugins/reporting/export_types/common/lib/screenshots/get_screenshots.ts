/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { HeadlessChromiumDriver as HeadlessBrowser } from '../../../../server/browsers';
import { LevelLogger } from '../../../../server/lib';
import { ApmTransaction, Screenshot, ElementsPositionAndAttribute } from './types';

export const getScreenshots = async (
  browser: HeadlessBrowser,
  elementsPositionAndAttributes: ElementsPositionAndAttribute[],
  logger: LevelLogger,
  txn: ApmTransaction
): Promise<Screenshot[]> => {
  logger.info(
    i18n.translate('xpack.reporting.screencapture.takingScreenshots', {
      defaultMessage: `taking screenshots`,
    })
  );

  const screenshots: Screenshot[] = [];

  for (let i = 0; i < elementsPositionAndAttributes.length; i++) {
    const apmSpan = txn?.startSpan('get_screenshots', 'read');
    const item = elementsPositionAndAttributes[i];
    const base64EncodedData = (await browser.screenshot(item.position)).toString('base64');

    screenshots.push({
      base64EncodedData,
      title: item.attributes.title,
      description: item.attributes.description,
    });

    if (apmSpan) apmSpan.end();
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
