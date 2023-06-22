/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import async from 'async';
import { omit } from 'lodash';

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';

export const getIndexName = (namespace: string) => `kbn-data-forge-${namespace}`;

export const createQueue = (
  esClient: Client,
  namespace: string,
  payloadSize = 1000,
  concurrency = 5,
  logger: ToolingLog
) => {
  const indexName = getIndexName(namespace);
  logger.debug(`createQueue > index name: ${indexName}`);
  return async.cargoQueue(
    (docs: object[], callback) => {
      const body: any[] = [];
      docs.forEach((doc) => {
        body.push({
          create: {
            _index: indexName,
          },
        });
        body.push(omit(doc, 'namespace'));
      });
      esClient
        .bulk({ body })
        .then((resp) => {
          if (resp.errors) {
            logger.error(
              `createQueue > Failed to index document to ${indexName} index: ${JSON.stringify(
                resp.errors
              )}`
            );
            return callback(new Error('Failed to index'));
          }
          return callback();
        })
        .catch((error) => {
          logger.error(
            `createQueue > Error while indexing document to ${indexName} index: ${error}`
          );
          callback(error);
        });
    },
    concurrency,
    payloadSize
  );
};
