/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from '@hapi/hapi';
import { EsClient, Esqueue } from './lib/esqueue';
import { Logger } from './log';

export function initQueue(server: Server, log: Logger, esClient: EsClient) {
  const queueIndex: string = server.config().get('xpack.code.queueIndex');
  const queueTimeoutMs: number = server.config().get('xpack.code.queueTimeoutMs');
  const queue = new Esqueue(queueIndex, {
    client: esClient,
    timeout: queueTimeoutMs,
  });
  return queue;
}
