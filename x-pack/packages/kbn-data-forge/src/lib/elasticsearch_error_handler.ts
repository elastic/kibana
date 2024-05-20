/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import { startsWith } from 'lodash';
import { ToolingLog } from '@kbn/tooling-log';
import { ElasticSearchService } from '../types';

const ERROR_MESSAGES = [
  'getaddrinfo ENOTFOUND',
  'connect ECONNREFUSED',
  'Client network socket disconnected',
];

export const elasticsearchErrorHandler =
  (service: ElasticSearchService, client: Client, logger: ToolingLog, ignoreOtherErrors = false) =>
  (error: Error) => {
    if (ERROR_MESSAGES.some((msg) => startsWith(error.message, msg))) {
      logger.info('Connection failed... trying again in 10 seconds');
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          service(client).then(resolve).catch(reject);
        }, 10000);
      });
    }
    logger.error(error.message);
    if (!ignoreOtherErrors) {
      throw error;
    } else {
      return error;
    }
  };
