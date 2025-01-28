/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cargoQueue } from 'async';
import moment from 'moment';
import { omit } from 'lodash';
import { ToolingLog } from '@kbn/tooling-log';
import { Client } from '@elastic/elasticsearch';
import type { Config, Doc } from '../types';
import { indices } from './indices';
import { INDEX_PREFIX } from '../constants';

type CargoQueue = ReturnType<typeof cargoQueue<Doc, Error>>;
let queue: CargoQueue;

function calculateIndexName(config: Config, doc: Doc) {
  if (doc.data_stream?.dataset) {
    const { dataset } = doc.data_stream;
    const type = doc.data_stream.type ?? 'logs';
    const namespace = doc.data_stream.namespace ?? 'default';
    return `${type}-${dataset}-${namespace}`;
  } else {
    const namespace = `${config.indexing.dataset}.${doc.namespace}`;
    return `${INDEX_PREFIX}-${namespace}-${moment(doc['@timestamp']).format('YYYY-MM-01')}`;
  }
}

export const createQueue = (config: Config, client: Client, logger: ToolingLog): CargoQueue => {
  if (queue != null) return queue;
  queue = cargoQueue<Doc, Error>(
    (docs, callback) => {
      const body: object[] = [];
      const startTs = Date.now();
      docs.forEach((doc) => {
        const indexName = calculateIndexName(config, doc);
        indices.add(indexName);
        body.push({ create: { _index: indexName } });
        body.push(omit(doc, 'namespace'));
      });
      client
        .bulk({ body, refresh: false })
        .then((resp) => {
          if (resp.errors) {
            logger.error(`Failed to index: ${resp.errors}`);
            return callback(new Error('Failed to index'));
          }
          logger.info(
            { took: resp.took, latency: Date.now() - startTs, indexed: docs.length },
            `Indexing ${docs.length} documents.`
          );
          return callback();
        })
        .catch((error) => {
          logger.error(error);
          callback(error);
        });
    },
    config.indexing.concurrency,
    config.indexing.payloadSize
  );
  return queue;
};
