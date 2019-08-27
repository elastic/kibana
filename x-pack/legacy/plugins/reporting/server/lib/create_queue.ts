/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PLUGIN_ID } from '../../common/constants';
import { KbnServer } from '../../types';
// @ts-ignore
import { Esqueue } from './esqueue';
import { createWorkerFactory } from './create_worker';
import { oncePerServer } from './once_per_server';
import { LevelLogger } from './level_logger';
// @ts-ignore
import { createTaggedLogger } from './create_tagged_logger'; // TODO remove createTaggedLogger once esqueue is removed

function createQueueFn(server: KbnServer): Esqueue {
  const queueConfig = server.config().get('xpack.reporting.queue');
  const index = server.config().get('xpack.reporting.index');

  const queueOptions = {
    interval: queueConfig.indexInterval,
    timeout: queueConfig.timeout,
    dateSeparator: '.',
    client: server.plugins.elasticsearch.getCluster('admin'),
    logger: createTaggedLogger(server, [PLUGIN_ID, 'esqueue', 'queue-worker']),
  };

  const queue: Esqueue = new Esqueue(index, queueOptions);

  if (queueConfig.pollEnabled) {
    // create workers to poll the index for idle jobs waiting to be claimed and executed
    const createWorker = createWorkerFactory(server);
    createWorker(queue);
  } else {
    const logger = LevelLogger.createForServer(server, [PLUGIN_ID, 'create_queue']);
    logger.info(
      'xpack.reporting.queue.pollEnabled is set to false. This Kibana instance ' +
        'will not poll for idle jobs to claim and execute. Make sure another ' +
        'Kibana instance with polling enabled is running in this cluster so ' +
        'reporting jobs can complete.',
      ['info']
    );
  }

  return queue;
}

export const createQueueFactory = oncePerServer(createQueueFn);
