/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import apm from 'elastic-apm-node';
import { HeadlessChromiumDriver as HeadlessBrowser } from '../../../../server/browsers';
import { LevelLogger } from '../../../../server/lib';
import { ConditionalHeaders, ServerFacade } from '../../../../types';
import { PAGELOAD_SELECTOR } from '../../constants';
import { ApmTransaction } from './types';

export const openUrl = async (
  server: ServerFacade,
  browser: HeadlessBrowser,
  url: string,
  conditionalHeaders: ConditionalHeaders,
  logger: LevelLogger,
  txn: ApmTransaction
): Promise<void> => {
  const apmSpan = txn?.startSpan('open_url', 'wait');
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
    apm.captureError(err);
    throw new Error(
      i18n.translate('xpack.reporting.screencapture.couldntLoadKibana', {
        defaultMessage: `An error occurred when trying to open the Kibana URL. You may need to increase '{configKey}'. {error}`,
        values: { configKey: 'xpack.reporting.capture.timeouts.openUrl', error: err },
      })
    );
  }
  if (apmSpan) apmSpan.end();
};
