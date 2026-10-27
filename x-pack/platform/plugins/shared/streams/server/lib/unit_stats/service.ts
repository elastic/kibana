/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { UnitStatsClient } from './client';

export class UnitStatsService {
  constructor(private readonly logger: Logger) {}

  /** A client for one request. `esClient` is the request's `asCurrentUser` client. */
  getClient({ esClient }: { esClient: ElasticsearchClient }): UnitStatsClient {
    return new UnitStatsClient({ esClient, logger: this.logger });
  }
}
