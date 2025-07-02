/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ingestStreamConfig } from './ingest_stream_config';

export const ingestStream = {
  name: 'logs.nginx',
  elasticsearch_assets: [],
  stream: ingestStreamConfig,
  privileges: {
    manage: true,
    monitor: true,
    lifecycle: true,
    simulate: true,
  },
};
