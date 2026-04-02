/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cargoQueue } from 'async';
import moment from 'moment';
import { omit } from 'lodash';
import type { ToolingLog } from '@kbn/tooling-log';
import type { Client } from '@elastic/elasticsearch';
import type { Config, Doc } from '../types';
import { indices } from './indices';
import { INDEX_PREFIX } from '../constants';

type CargoQueue = ReturnType<typeof cargoQueue<Doc, Error>>;

function calculateIndexName(config: Config, doc: Doc) {
  if (config.indexing.slashLogs) {
    return 'logs';
  }
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
  return cargoQueue<Doc, Error>(
    (docs, callback) => {
      if (config.destination.type === 'http') {
        post(config, docs, logger)
          .then(() => callback())
          .catch(callback);

        return;
      }

      const operations: object[] = [];
      const startTs = Date.now();
      docs.forEach((doc) => {
        const indexName = calculateIndexName(config, doc);
        indices.add(indexName);
        operations.push({ create: { _index: indexName } });
        operations.push(omit(doc, 'namespace'));
      });
      client
        .bulk({ operations, refresh: false })
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
};

async function post(config: Config, docs: Doc[], logger: ToolingLog) {
  if (config.destination.type !== 'http') {
    throw new Error('post() should only be called with http destination');
  }
  try {
    const startTs = Date.now();
    const response = await fetch(config.destination.url, {
      method: 'POST',
      body: JSON.stringify(docs),
      headers: {
        'content-type': 'application/json',
        ...config.destination.headers,
      },
    });
    if (!response.ok) {
      const data = await response.text();
      throw new Error(`Failed to send documents. Status: ${response.status}, Data: ${data}`);
    }
    logger.info(
      {
        statusCode: response.status,
        latency: Date.now() - startTs,
        indexed: docs.length,
      },
      `Sent ${docs.length} documents.`
    );
  } catch (error) {
    logger.error(error);
    throw error;
  }
}
