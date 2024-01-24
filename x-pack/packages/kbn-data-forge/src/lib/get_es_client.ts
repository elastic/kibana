/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
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

  esClient = new Client({
    node: config.elasticsearch.host,
    auth,
  });
  return esClient;
};
