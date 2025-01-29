/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { format, parse } from 'url';
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
  default: format({
    ...parse(config['elasticsearch.hosts']),
    auth: `${config['elasticsearch.username']}:${config['elasticsearch.password']}`,
  }),
};

export const connectorIdOption = {
  describe: 'The ID of the connector',
  string: true as const,
};
