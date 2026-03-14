/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readKibanaConfig } from './read_kibana_config';

const config = readKibanaConfig();

export const kibanaOption = {
  describe: 'Where Kibana is running',
  string: true as const,
  default: process.env.KIBANA_HOST || 'http://localhost:5601',
};
export const elasticsearchOption = {
  alias: 'es',
  describe: 'Where Elasticsearch is running',
  string: true as const,
  default: (() => {
    const elasticsearchUrl = new URL(
      Array.isArray(config['elasticsearch.hosts'])
        ? config['elasticsearch.hosts'][0]
        : config['elasticsearch.hosts']
    );

    elasticsearchUrl.username = config['elasticsearch.username'];
    elasticsearchUrl.password = config['elasticsearch.password'];

    return elasticsearchUrl.toString();
  })(),
};

export const connectorIdOption = {
  describe: 'The ID of the connector',
  string: true as const,
};
