/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { Logger as PluginLogger } from '@kbn/core-di';
import { inject, injectable } from 'inversify';
import { bulkMarkApiKeysForInvalidation } from './bulk_mark_api_keys_for_invalidation';
import { ApiKeyInvalidationSavedObjectsClientToken } from './tokens';

export interface ApiKeyInvalidationServiceContract {
  markApiKeysForInvalidation(apiKeys: string[]): Promise<void>;
}

@injectable()
export class ApiKeyInvalidationService implements ApiKeyInvalidationServiceContract {
  constructor(
    @inject(ApiKeyInvalidationSavedObjectsClientToken)
    private readonly savedObjectsClient: SavedObjectsClientContract,
    @inject(PluginLogger) private readonly logger: Logger
  ) {}

  public async markApiKeysForInvalidation(apiKeys: string[]): Promise<void> {
    await bulkMarkApiKeysForInvalidation({ apiKeys }, this.logger, this.savedObjectsClient);
  }
}
