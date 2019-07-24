/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
// @ts-ignore
import { cryptoFactory } from '../../../server/lib/crypto';
import { CryptoFactory, JobDocPayload, KbnServer } from '../../../types';

export const decryptJobHeaders = async ({
  job,
  server,
}: {
  job: JobDocPayload;
  server: KbnServer;
}) => {
  const crypto: CryptoFactory = cryptoFactory(server);
  const decryptedHeaders: string = await crypto.decrypt(job.headers);
  return { job, decryptedHeaders, server };
};
