/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { ConditionalHeaders, ServerFacade } from '../../../../types';
import { LevelLogger } from '../../../../server/lib';
import { HeadlessChromiumDriver as HeadlessBrowser } from '../../../../server/browsers';
import { PAGELOAD_SELECTOR } from '../../constants';

export const openUrl = async (
  server: ServerFacade,
  browser: HeadlessBrowser,
  url: string,
  conditionalHeaders: ConditionalHeaders,
  logger: LevelLogger
): Promise<void> => {
  const config = server.config();

  try {
    await browser.open(
      url,
      {
        conditionalHeaders,
        waitForSelector: PAGELOAD_SELECTOR,
        timeout: config.get('xpack.reporting.capture.timeouts.openUrl'),
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
