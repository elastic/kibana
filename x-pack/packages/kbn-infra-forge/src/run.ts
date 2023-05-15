/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { range } from 'lodash';
import moment from 'moment';
import datemath from '@kbn/datemath';
import type { Moment } from 'moment';
import type { ToolingLog } from '@kbn/tooling-log';
import type { Client } from '@elastic/elasticsearch';
import { createQueue, getIndexName } from './lib/queue';
import { deleteTemplate, installTemplate } from './lib/install_template';
import * as fakeHosts from './data_sources/fake_hosts';

const generateEventsFns = {
  fake_hosts: fakeHosts.generateEvent,
};

const templates = {
  fake_hosts: fakeHosts.template,
};

const EVENTS_PER_CYCLE = 1;
const PAYLOAD_SIZE = 10000;
const CONCURRENCY = 5;
const INDEX_INTERVAL = 60000;
const DATASET = 'fake_hosts';

const createEvents = (size: number, timestamp: Moment) =>
  range(size)
    .map((i) => {
      const generateEvent = generateEventsFns[DATASET];
      return generateEvent(i, timestamp, INDEX_INTERVAL);
    })
    .flat();

function indexHistory(lookback: string, queue: any, logger: ToolingLog, nextTimestamp?: Moment) {
  const now = moment();
  const startTs = datemath.parse(lookback, { momentInstance: moment });
  const timestamp = nextTimestamp || moment(startTs);
  createEvents(EVENTS_PER_CYCLE, timestamp).forEach((event) => queue.push(event));
  return queue.drain().then(() => {
    if (timestamp.isBefore(now)) {
      return indexHistory(lookback, queue, logger, timestamp.add(INDEX_INTERVAL, 'ms'));
    }
    return Promise.resolve();
  });
}

export const generate = async ({
  esClient,
  lookback,
  logger,
}: {
  esClient: Client;
  lookback: string;
  logger: ToolingLog;
}) => {
  const queue = createQueue(esClient, DATASET, PAYLOAD_SIZE, CONCURRENCY, logger);
  const template = templates[DATASET];
  await installTemplate(esClient, template, DATASET, logger).then(() =>
    indexHistory(lookback, queue, logger)
  );
  return getIndexName(DATASET);
};

export const cleanup = async ({ esClient, logger }: { esClient: Client; logger: ToolingLog }) => {
  await deleteTemplate(esClient, DATASET, logger);
};
