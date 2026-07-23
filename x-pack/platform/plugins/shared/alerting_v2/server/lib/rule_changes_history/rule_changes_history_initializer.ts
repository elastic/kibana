/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { ChangeHistoryClient } from '@kbn/change-history';
import type { IResourceInitializer } from '../services/resource_service/resource_manager';

/**
 * Provisions the rule changes-history data stream via the shared
 * {@link ChangeHistoryClient}, exposed as an {@link IResourceInitializer} so the
 * {@link ResourceManager} owns its lifecycle. Registered as an optional resource
 * so a provisioning failure never blocks rule-execution readiness.
 *
 * The `ChangeHistoryClient` is a DI singleton, so this initializes the same
 * instance that {@link RuleChangesHistoryService} later logs through.
 */
export class RuleChangesHistoryInitializer implements IResourceInitializer {
  constructor(
    private readonly client: ChangeHistoryClient,
    private readonly esClient: ElasticsearchClient
  ) {}

  public async initialize(): Promise<void> {
    await this.client.initialize(this.esClient);
  }
}
