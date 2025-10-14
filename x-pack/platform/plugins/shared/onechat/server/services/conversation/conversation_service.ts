/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  KibanaRequest,
  Logger,
  SecurityServiceStart,
  ElasticsearchServiceStart,
} from '@kbn/core/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { getCurrentSpaceId } from '../../utils/spaces';
import { createModelProvider } from '../runner/model_provider';
import type { ConversationClient } from './client';
import { createClient } from './client';
import { createStorage } from './storage';
import {
  createService as createSummarizationService,
  type ConversationSummaryService,
} from './summarization';

export interface ConversationService {
  getScopedClient(options: { request: KibanaRequest }): Promise<ConversationClient>;
  getSummarizationService(options: { request: KibanaRequest }): Promise<ConversationSummaryService>;
}

interface ConversationServiceDeps {
  logger: Logger;
  security: SecurityServiceStart;
  elasticsearch: ElasticsearchServiceStart;
  inference: InferenceServerStart;
  spaces?: SpacesPluginStart;
}

export class ConversationServiceImpl implements ConversationService {
  private readonly logger: Logger;
  private readonly security: SecurityServiceStart;
  private readonly elasticsearch: ElasticsearchServiceStart;
  private readonly inference: InferenceServerStart;
  private readonly spaces?: SpacesPluginStart;

  constructor({ logger, security, elasticsearch, spaces, inference }: ConversationServiceDeps) {
    this.logger = logger;
    this.security = security;
    this.elasticsearch = elasticsearch;
    this.inference = inference;
    this.spaces = spaces;
  }

  async getScopedClient({ request }: { request: KibanaRequest }): Promise<ConversationClient> {
    const authUser = this.security.authc.getCurrentUser(request);
    if (!authUser) {
      throw new Error('No user bound to the provided request');
    }

    const esClient = this.elasticsearch.client.asScoped(request).asInternalUser;
    const storage = createStorage({ logger: this.logger, esClient });
    const user = { id: authUser.profile_uid!, username: authUser.username };
    const space = getCurrentSpaceId({ request, spaces: this.spaces });

    return createClient({ user, storage, space });
  }

  async getSummarizationService({
    request,
  }: {
    request: KibanaRequest;
  }): Promise<ConversationSummaryService> {
    const spaceId = getCurrentSpaceId({ request, spaces: this.spaces });
    const esClient = this.elasticsearch.client.asScoped(request).asInternalUser;
    const modelProvider = createModelProvider({ inference: this.inference, request });

    return createSummarizationService({
      logger: this.logger,
      esClient,
      spaceId,
      security: this.security,
      request,
      modelProvider,
    });
  }
}
