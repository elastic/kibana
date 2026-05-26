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
import type { UserIdAndName } from '@kbn/agent-builder-common';
import { getUserFromRequest } from '../utils';
import { getCurrentSpaceId } from '../../utils/spaces';
import type { ConversationClient } from './client';
import { createClient } from './client';

export interface ConversationService {
  getScopedClient(options: {
    request: KibanaRequest;
    userName?: string;
  }): Promise<ConversationClient>;
}

interface ConversationServiceDeps {
  logger: Logger;
  security: SecurityServiceStart;
  elasticsearch: ElasticsearchServiceStart;
  spaces?: SpacesPluginStart;
}

export class ConversationServiceImpl implements ConversationService {
  private readonly logger: Logger;
  private readonly security: SecurityServiceStart;
  private readonly elasticsearch: ElasticsearchServiceStart;
  private readonly spaces?: SpacesPluginStart;

  constructor({ logger, security, elasticsearch, spaces }: ConversationServiceDeps) {
    this.logger = logger;
    this.security = security;
    this.elasticsearch = elasticsearch;
    this.spaces = spaces;
  }

  async getScopedClient({
    request,
    userName,
  }: {
    request: KibanaRequest;
    /**
     * Optional override for the conversation owner's username. Pass this when the request
     * is a Task Manager `fakeRequest` and the human owner's identity was captured
     * upstream (e.g. on the agent execution document). Without it, the conversation would
     * be persisted under the API key's identity instead of the originating user's, which
     * makes the conversation unreadable to the originator (SO filtered by `user_name`).
     */
    userName?: string;
  }): Promise<ConversationClient> {
    const scopedClient = this.elasticsearch.client.asScoped(request);
    const user: UserIdAndName = userName
      ? { username: userName }
      : await getUserFromRequest({
          request,
          security: this.security,
          esClient: scopedClient.asCurrentUser,
        });
    const esClient = scopedClient.asInternalUser;
    const space = getCurrentSpaceId({ request, spaces: this.spaces });

    return createClient({ user, esClient, logger: this.logger, space });
  }
}
