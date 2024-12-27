/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Fs from 'fs';
import { Client } from '@elastic/elasticsearch';
import { CA_CERT_PATH } from '@kbn/dev-utils';
import { Config } from '../types';

let esClient: Client;

export const getEsClient = (config: Config) => {
  if (esClient) return esClient;

  const auth = config.elasticsearch.apiKey
    ? { apiKey: config.elasticsearch.apiKey }
    : {
        username: config.elasticsearch.username,
        password: config.elasticsearch.password,
      };

  const isHTTPS = new URL(config.elasticsearch.host).protocol === 'https:';
  // load the CA cert from disk if necessary
  const caCert = isHTTPS ? Fs.readFileSync(CA_CERT_PATH) : null;

  esClient = new Client({
    node: config.elasticsearch.host,
    auth,
    tls: caCert
      ? {
          ca: caCert,
          rejectUnauthorized: false,
        }
      : undefined,
  });

  return esClient;
};
