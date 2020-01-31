/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { ElasticsearchServiceSetup } from 'kibana/server';
import { Logger, ServerFacade } from '../../../types';
import { HeadlessChromiumDriverFactory } from '../../browsers/chromium/driver_factory';
import { validateBrowser } from './validate_browser';
import { validateEncryptionKey } from './validate_encryption_key';
import { validateMaxContentLength } from './validate_max_content_length';
import { validateServerHost } from './validate_server_host';

export async function runValidations(
  server: ServerFacade,
  elasticsearch: ElasticsearchServiceSetup,
  logger: Logger,
  browserFactory: HeadlessChromiumDriverFactory
) {
  try {
    await Promise.all([
      validateBrowser(server, browserFactory, logger),
      validateEncryptionKey(server, logger),
      validateMaxContentLength(server, elasticsearch, logger),
      validateServerHost(server),
    ]);
    logger.debug(
      i18n.translate('xpack.reporting.selfCheck.ok', {
        defaultMessage: `Reporting plugin self-check ok!`,
      })
    );
  } catch (err) {
    logger.warning(
      i18n.translate('xpack.reporting.selfCheck.warning', {
        defaultMessage: `Reporting plugin self-check generated a warning: {err}`,
        values: {
          err,
        },
      })
    );
  }
}
