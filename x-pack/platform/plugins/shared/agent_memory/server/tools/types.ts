/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import type { MemoryService } from '../lib/memory';

/**
 * Everything the memory tools need — and nothing else.
 *
 * The tools deliberately take no plugin server object and no scoped-client
 * factory: each handler already receives a request-scoped `esClient` from the
 * Agent Builder tool context, and the acting user is resolved from the request.
 */
export interface MemoryToolsOptions {
  getMemoryService: (esClient: ElasticsearchClient) => MemoryService;
  /**
   * Core's security service. Optional because writes fall back to
   * `_security/_authenticate` for fake requests (workflow-driven runs).
   */
  getSecurity: () => SecurityServiceStart | undefined;
}
