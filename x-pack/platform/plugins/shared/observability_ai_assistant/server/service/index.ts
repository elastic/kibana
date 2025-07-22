/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, KibanaRequest, Logger } from '@kbn/core/server';
import { getSpaceIdFromPath } from '@kbn/spaces-plugin/common';
import type { AssistantScope } from '@kbn/ai-assistant-common';
import { once } from 'lodash';
import pRetry from 'p-retry';
import { ObservabilityAIAssistantScreenContextRequest } from '../../common/types';
import type { ObservabilityAIAssistantPluginStartDependencies } from '../types';
import { ChatFunctionClient } from './chat_function_client';
import { ObservabilityAIAssistantClient } from './client';
import { KnowledgeBaseService } from './knowledge_base_service';
import type { RegistrationCallback, RespondFunctionResources } from './types';
import { ObservabilityAIAssistantConfig } from '../config';
import { createOrUpdateConversationIndexAssets } from './index_assets/create_or_update_conversation_index_assets';

export function getResourceName(resource: string) {
  return `.kibana-observability-ai-assistant-${resource}`;
}

export const resourceNames = {
  componentTemplate: {
    conversations: getResourceName('component-template-conversations'),
    kb: getResourceName('component-template-kb'),
  },
  writeIndexAlias: {
    conversations: getResourceName('conversations'),
    kb: getResourceName('kb'),
  },
  indexPatterns: {
    conversations: getResourceName('conversations*'),
    kb: getResourceName('kb*'),
  },
  indexTemplate: {
    conversations: getResourceName('index-template-conversations'),
    kb: getResourceName('index-template-kb'),
  },
  concreteWriteIndexName: {
    conversations: getResourceName('conversations-000001'),
    kb: getResourceName('kb-000001'),
  },
};

const createConversationIndexAssetsOnce = once(
  (logger: Logger, core: CoreSetup<ObservabilityAIAssistantPluginStartDependencies>) =>
    pRetry(() => createOrUpdateConversationIndexAssets({ logger, core }))
);

export class ObservabilityAIAssistantService {
  private readonly core: CoreSetup<ObservabilityAIAssistantPluginStartDependencies>;
  private readonly logger: Logger;
  private config: ObservabilityAIAssistantConfig;
  private readonly registrations: RegistrationCallback[] = [];

  constructor({
    logger,
    core,
    config,
  }: {
    logger: Logger;
    core: CoreSetup<ObservabilityAIAssistantPluginStartDependencies>;
    config: ObservabilityAIAssistantConfig;
  }) {
    this.core = core;
    this.logger = logger;
    this.config = config;
  }

  async getClient({
    request,
    scopes,
  }: {
    request: KibanaRequest;
    scopes?: AssistantScope[];
  }): Promise<ObservabilityAIAssistantClient> {
    const controller = new AbortController();

    request.events.aborted$.subscribe(() => {
      controller.abort();
    });

    const [[coreStart, plugins]] = await Promise.all([
      this.core.getStartServices(),
      createConversationIndexAssetsOnce(this.logger, this.core),
    ]);

    // user will not be found when executed from system connector context
    const user = plugins.security.authc.getCurrentUser(request);

    const soClient = coreStart.savedObjects.getScopedClient(request);
    const uiSettingsClient = coreStart.uiSettings.asScopedToClient(soClient);

    const basePath = coreStart.http.basePath.get(request);

    const { spaceId } = getSpaceIdFromPath(basePath, coreStart.http.basePath.serverBasePath);
    const inferenceClient = plugins.inference.getClient({ request });

    const { asInternalUser } = coreStart.elasticsearch.client;
    const { asCurrentUser } = coreStart.elasticsearch.client.asScoped(request);

    const kbService = new KnowledgeBaseService({
      core: this.core,
      logger: this.logger.get('kb'),
      config: this.config,
      esClient: {
        asInternalUser,
      },
    });

    return new ObservabilityAIAssistantClient({
      core: this.core,
      config: this.config,
      actionsClient: await plugins.actions.getActionsClientWithRequest(request),
      uiSettingsClient,
      namespace: spaceId,
      esClient: {
        asInternalUser,
        asCurrentUser,
      },
      inferenceClient,
      logger: this.logger,
      user: user
        ? {
            id: user.profile_uid,
            name: user.username,
          }
        : undefined,
      knowledgeBaseService: kbService,
      scopes: scopes || ['all'],
    });
  }

  async getFunctionClient({
    screenContexts,
    signal,
    resources,
    client,
    scopes,
  }: {
    screenContexts: ObservabilityAIAssistantScreenContextRequest[];
    signal: AbortSignal;
    resources: RespondFunctionResources;
    client: ObservabilityAIAssistantClient;
    scopes: AssistantScope[];
  }): Promise<ChatFunctionClient> {
    const fnClient = new ChatFunctionClient(screenContexts);

    const params = {
      signal,
      functions: fnClient,
      resources,
      client,
      scopes,
    };

    await Promise.all(
      this.registrations.map((fn) =>
        fn(params).catch((error) => {
          this.logger.error(`Error registering functions`);
          this.logger.error(error);
        })
      )
    );

    return fnClient;
  }

  register(cb: RegistrationCallback) {
    this.registrations.push(cb);
  }
}
