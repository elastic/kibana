/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, IRouter, KibanaRequest, Logger } from '@kbn/core/server';
import type { MemoryService } from '../lib/memory';
import type { BackgroundActivityGateRegistry } from '../lib/gate';
import type { MemoryWorkflowsService } from '../workflows/workflows_service';

export interface MemoryRouteDependencies {
  router: IRouter;
  logger: Logger;
  isMemoryEnabled: () => boolean;
  isStorageInstalled: () => boolean;
  /** Builds a service over the requesting user's credentials. */
  getMemoryService: (esClient: ElasticsearchClient) => MemoryService;
  /** Resolves the acting user for a write. */
  getUser: (request: KibanaRequest, esClient: ElasticsearchClient) => Promise<string>;
  getWorkflowsService: () => MemoryWorkflowsService;
  backgroundActivityGates: BackgroundActivityGateRegistry;
  /** Re-runs the storage installer, for the setup endpoint. */
  installStorage: () => Promise<void>;
  /**
   * Re-runs the managed workflow installer.
   *
   * Needed because `install` is best-effort and no-ops when Elasticsearch is not
   * ready yet, so the install attempted at plugin start can silently do nothing.
   * Setup retries it rather than assuming boot succeeded.
   */
  installWorkflows: () => Promise<void>;
}
