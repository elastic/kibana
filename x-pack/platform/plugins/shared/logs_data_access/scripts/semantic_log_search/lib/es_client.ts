/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import type { ConnectionConfig } from './connection_config';

export function createEsClient(config: ConnectionConfig): Client {
  return new Client({
    node: config.esUrl,
    auth: {
      username: config.user,
      password: config.password,
    },
    requestTimeout: 120000, // 2 minutes for reindex operations
  });
}
