/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { Logger } from '@kbn/logging';
import type { ElasticsearchServiceStart } from '@kbn/core-elasticsearch-server';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { UserIdAndName } from '@kbn/agent-builder-common';
import {
  ShortTermMemoryIdentityError,
  type MemoryStart,
  type ScopedShortTermMemoryClient,
  type ShortTermMemorySystemClient,
} from '@kbn/agent-builder-server';
import { getCurrentSpaceId } from '../../utils/spaces';
import { getUserFromRequest } from '../utils';
import { createEnsureMemoryIndex } from './storage';
import { ShortTermMemoryClient } from './memory_client';
import { ShortTermMemorySystemClientImpl } from './memory_system_client';

export interface MemoryServiceDeps {
  logger: Logger;
  elasticsearch: ElasticsearchServiceStart;
  security: SecurityServiceStart;
  spaces?: SpacesPluginStart;
}

export interface MemoryService extends MemoryStart {
  /**
   * Short-term memory of `user` rather than of the request's caller, in the request's space. A
   * Task Manager run authenticates with an API key, so its own identity is not the conversation
   * owner the memory belongs to.
   */
  getScopedClientAsUser(params: {
    request: KibanaRequest;
    user: UserIdAndName;
  }): ScopedShortTermMemoryClient;
}

export const createMemoryService = (deps: MemoryServiceDeps): MemoryService =>
  new MemoryServiceImpl(deps);

/**
 * Short-term memories are KIs in the Elastic AI index. Only Kibana writes them, as the internal
 * user, and every scoped read and write filters on the caller's stable user id (the identity Agent
 * Builder conversations are owned by). Outside Kibana, the access action stamped on each memory
 * hides it from everyone without an explicit grant on the index.
 */
class MemoryServiceImpl implements MemoryService {
  private readonly ensureIndex: () => Promise<void>;

  constructor(private readonly deps: MemoryServiceDeps) {
    this.ensureIndex = createEnsureMemoryIndex({
      esClient: deps.elasticsearch.client.asInternalUser,
      logger: deps.logger,
    });
  }

  async getScopedClient({
    request,
  }: {
    request: KibanaRequest;
  }): Promise<ScopedShortTermMemoryClient> {
    const { elasticsearch, security } = this.deps;
    const user = await getUserFromRequest({
      request,
      security,
      esClient: elasticsearch.client.asScoped(request).asCurrentUser,
    });
    return this.getScopedClientAsUser({ request, user });
  }

  getScopedClientAsUser({
    request,
    user: { id, username },
  }: {
    request: KibanaRequest;
    user: UserIdAndName;
  }): ScopedShortTermMemoryClient {
    if (id === undefined) {
      throw new ShortTermMemoryIdentityError();
    }
    return new ShortTermMemoryClient({
      esClient: this.deps.elasticsearch.client.asInternalUser,
      ensureIndex: this.ensureIndex,
      space: getCurrentSpaceId({ request, spaces: this.deps.spaces }),
      user: { id, username },
    });
  }

  getSystemClient(): ShortTermMemorySystemClient {
    return new ShortTermMemorySystemClientImpl({
      esClient: this.deps.elasticsearch.client.asInternalUser,
    });
  }
}
