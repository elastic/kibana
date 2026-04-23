/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cargoQueue } from 'async';
import moment from 'moment';
import { omit } from 'lodash';
import axios from 'axios';
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
    const resp = await axios.post(config.destination.url, docs, {
      headers: config.destination.headers,
    });
    logger.info(
      {
        statusCode: resp.status,
        latency: Date.now() - startTs,
        indexed: docs.length,
      },
      `Sent ${docs.length} documents.`
    );
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      logger.error(
        `Failed to send documents. Status: ${error.response.status}, Data: ${JSON.stringify(
          error.response.data
        )}`
      );
    } else {
      logger.error(error);
    }
    throw error;
  }
}
