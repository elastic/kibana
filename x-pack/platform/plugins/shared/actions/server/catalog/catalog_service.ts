/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { CatalogRefreshResult } from './types';

export interface CatalogServiceOptions {
  logger: Logger;
  publicKeys: readonly string[];
  refreshIntervalMs: number;
}

export class CatalogService {
  private readonly logger: Logger;
  private readonly publicKeys: readonly string[];
  private readonly refreshIntervalMs: number;

  constructor(options: CatalogServiceOptions) {
    this.logger = options.logger;
    this.publicKeys = options.publicKeys;
    this.refreshIntervalMs = options.refreshIntervalMs;
  }

  public async refresh(_options?: {
    signal?: AbortSignal;
  }): Promise<CatalogRefreshResult | undefined> {
    // Fetch and storage land in a later phase. Keep the task runner callable until then.
    void this.logger;
    void this.publicKeys;
    void this.refreshIntervalMs;
    return undefined;
  }

  public stop(): void {}
}
