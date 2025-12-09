/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, KibanaRequest, Logger } from '@kbn/core/server';
import { StorageIndexAdapter } from '@kbn/storage-adapter';
import type { StreamsPluginStartDependencies } from '../../../types';
import { LLMSuggestionClient } from './llm_suggestion_client';
import { type StoredLLMSuggestion } from './stored_llm_suggestions';
import { llmSuggestionsStorageSettings } from './storage_settings';
import type { LLMSuggestionStorageSettings } from './storage_settings';

export class LLMSuggestionService {
  constructor(
    private readonly coreSetup: CoreSetup<StreamsPluginStartDependencies>,
    private readonly logger: Logger
  ) {}

  async getClientWithRequest({
    request,
  }: {
    request: KibanaRequest;
  }): Promise<LLMSuggestionClient> {
    const [coreStart] = await this.coreSetup.getStartServices();

    const adapter = new StorageIndexAdapter<LLMSuggestionStorageSettings, StoredLLMSuggestion>(
      coreStart.elasticsearch.client.asInternalUser,
      this.logger.get('LLMSuggestions'),
      llmSuggestionsStorageSettings
    );

    return new LLMSuggestionClient({
      storageClient: adapter.getClient(),
    });
  }
}
