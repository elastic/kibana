/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ESQueueInstance, Logger } from '../../types';
import { ReportingCore } from '../core';
import { createTaggedLogger } from './create_tagged_logger'; // TODO remove createTaggedLogger once esqueue is removed
import { createWorkerFactory } from './create_worker';
// @ts-ignore
import { Esqueue } from './esqueue';

export async function createQueueFactory<JobParamsType, JobPayloadType>(
  reporting: ReportingCore,
  logger: Logger
): Promise<ESQueueInstance> {
  const config = reporting.getConfig();
  const queueIndexInterval = config.get('queue', 'indexInterval');
  const queueTimeout = config.get('queue', 'timeout');
  const queueIndex = config.get('index');
  const isPollingEnabled = config.get('queue', 'pollEnabled');

  const elasticsearch = await reporting.getElasticsearchService();
  const queueOptions = {
    interval: queueIndexInterval,
    timeout: queueTimeout,
    dateSeparator: '.',
    client: elasticsearch.dataClient,
    logger: createTaggedLogger(logger, ['esqueue', 'queue-worker']),
  };

  const queue: ESQueueInstance = new Esqueue(queueIndex, queueOptions);

  if (isPollingEnabled) {
    // create workers to poll the index for idle jobs waiting to be claimed and executed
    const createWorker = createWorkerFactory(reporting, logger);
    await createWorker(queue);
  } else {
    logger.info(
      'xpack.reporting.queue.pollEnabled is set to false. This Kibana instance ' +
        'will not poll for idle jobs to claim and execute. Make sure another ' +
        'Kibana instance with polling enabled is running in this cluster so ' +
        'reporting jobs can complete.',
      ['create_queue']
    );
  }

  return queue;
}
