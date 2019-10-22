/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EsClient, Esqueue } from './lib/esqueue';
import { Logger } from './log';
import { ServerOptions } from './server_options';

export function initQueue(serverOptions: ServerOptions, log: Logger, esClient: EsClient) {
  const queueIndex: string = serverOptions.queueIndex;
  const queueTimeoutMs: number = serverOptions.queueTimeoutMs;
  const queue = new Esqueue(queueIndex, {
    client: esClient,
    timeout: queueTimeoutMs,
  });
  return queue;
}
