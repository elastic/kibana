/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
// @ts-ignore
import { cryptoFactory } from '../../../server/lib/crypto';
import { CryptoFactory, JobDocPayload, ServerFacade, Logger } from '../../../types';

export const decryptJobHeaders = async ({
  job,
  server,
  logger,
}: {
  job: JobDocPayload;
  server: ServerFacade;
  logger: Logger;
}): Promise<{
  job: JobDocPayload;
  server: ServerFacade;
  decryptedHeaders: Record<string, string>;
}> => {
  const crypto: CryptoFactory = cryptoFactory(server);
  try {
    const decryptedHeaders: Record<string, string> = await crypto.decrypt(job.headers);
    return { job, decryptedHeaders, server };
  } catch (err) {
    logger.error(err);

    throw new Error(
      i18n.translate(
        'xpack.reporting.exportTypes.common.failedToDecryptReportJobDataErrorMessage',
        {
          defaultMessage:
            'Failed to decrypt report job data. Please ensure that {encryptionKey} is set and re-generate this report. {err}',
          values: { encryptionKey: 'xpack.reporting.encryptionKey', err: err.toString() },
        }
      )
    );
  }
};
