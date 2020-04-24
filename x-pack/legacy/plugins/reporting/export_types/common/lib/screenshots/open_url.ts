/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { HeadlessChromiumDriver as HeadlessBrowser } from '../../../../server/browsers';
import { LevelLogger } from '../../../../server/lib';
import { CaptureConfig } from '../../../../server/types';
import { ConditionalHeaders } from '../../../../types';
import { PAGELOAD_SELECTOR } from '../../constants';

export const openUrl = async (
  captureConfig: CaptureConfig,
  browser: HeadlessBrowser,
  url: string,
  conditionalHeaders: ConditionalHeaders,
  logger: LevelLogger,
  page?: number
): Promise<void> => {
  // If we're moving to another page in the app, we'll want to wait for the app to tell us
  // it's loaded the next page.
  const selector = page && page > 1 ? `[data-share-page="${page}"]` : PAGELOAD_SELECTOR;

  try {
    await browser.open(
      url,
      {
        conditionalHeaders,
        waitForSelector: selector,
        timeout: captureConfig.timeouts.openUrl,
      },
      logger
    );
  } catch (err) {
    throw new Error(
      i18n.translate('xpack.reporting.screencapture.couldntLoadKibana', {
        defaultMessage: `An error occurred when trying to open the Kibana URL. You may need to increase '{configKey}'. {error}`,
        values: {
          configKey: 'xpack.reporting.capture.timeouts.openUrl',
          error: err,
        },
      })
    );
  }
};
