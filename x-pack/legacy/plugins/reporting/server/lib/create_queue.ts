/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElasticsearchServiceSetup } from 'kibana/server';
import { ESQueueInstance, ServerFacade, QueueConfig, Logger } from '../../types';
import { ReportingCore } from '../core';
// @ts-ignore
import { Esqueue } from './esqueue';
import { createWorkerFactory } from './create_worker';
import { createTaggedLogger } from './create_tagged_logger'; // TODO remove createTaggedLogger once esqueue is removed

export async function createQueueFactory<JobParamsType, JobPayloadType>(
  reporting: ReportingCore,
  server: ServerFacade,
  elasticsearch: ElasticsearchServiceSetup,
  logger: Logger
): Promise<ESQueueInstance> {
  const queueConfig: QueueConfig = server.config().get('xpack.reporting.queue');
  const index = server.config().get('xpack.reporting.index');

  const queueOptions = {
    interval: queueConfig.indexInterval,
    timeout: queueConfig.timeout,
    dateSeparator: '.',
    client: elasticsearch.dataClient,
    logger: createTaggedLogger(logger, ['esqueue', 'queue-worker']),
  };

  const queue: ESQueueInstance = new Esqueue(index, queueOptions);

  if (queueConfig.pollEnabled) {
    // create workers to poll the index for idle jobs waiting to be claimed and executed
    const createWorker = createWorkerFactory(reporting, server, elasticsearch, logger);
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
