/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Esqueue } from './esqueue';
import { createWorkerFactory } from './create_worker';
import { oncePerServer } from './once_per_server';
import { createTaggedLogger } from './create_tagged_logger';

const dateSeparator = '.';

function createQueueFn(server) {
  const queueConfig = server.config().get('xpack.reporting.queue');
  const index = server.config().get('xpack.reporting.index');
  const createWorker = createWorkerFactory(server);

  const logger = createTaggedLogger(server, ['reporting', 'esqueue']);
  const queueOptions = {
    interval: queueConfig.indexInterval,
    timeout: queueConfig.timeout,
    dateSeparator: dateSeparator,
    client: server.plugins.elasticsearch.getCluster('admin'),
    logger,
  };

  const queue = new Esqueue(index, queueOptions);

  if (queueConfig.pollEnabled) {
    // create workers to poll the index for idle jobs waiting to be claimed and executed
    createWorker(queue);
  } else {
    logger(
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
