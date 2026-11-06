/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { Logger } from '@kbn/logging';
import type { ElasticsearchServiceStart } from '@kbn/core-elasticsearch-server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { WorkspaceFileContent } from '@kbn/agent-builder-common';
import { getCurrentSpaceId } from '../../utils/spaces';
import type { ConversationService } from '../conversation';
import { WorkspaceClient } from './client/workspace_client';
import { createStorage as createWorkspaceStorage } from './client/storage';
import { resolveWorkspaceFilePath } from './workspace_path';

export interface ScopedWorkspaceClient {
  readFile(opts: {
    conversationId: string;
    path: string;
  }): Promise<WorkspaceFileContent | undefined>;
}

export interface WorkspaceService {
  getScopedClient(opts: { request: KibanaRequest }): Promise<ScopedWorkspaceClient>;
}

export interface WorkspaceServiceDeps {
  logger: Logger;
  elasticsearch: ElasticsearchServiceStart;
  spaces?: SpacesPluginStart;
  conversations: ConversationService;
}

export const createWorkspaceService = (deps: WorkspaceServiceDeps): WorkspaceService => {
  return new WorkspaceServiceImpl(deps);
};

class WorkspaceServiceImpl implements WorkspaceService {
  constructor(private readonly deps: WorkspaceServiceDeps) {}

  async getScopedClient({ request }: { request: KibanaRequest }): Promise<ScopedWorkspaceClient> {
    const { logger, elasticsearch, spaces, conversations } = this.deps;

    const conversationClient = await conversations.getScopedClient({ request });
    const workspaceClient = new WorkspaceClient({
      storage: createWorkspaceStorage({
        logger,
        esClient: elasticsearch.client.asScoped(request).asInternalUser,
      }),
      space: getCurrentSpaceId({ request, spaces }),
    });

    return {
      async readFile({ conversationId, path: inputPath }) {
        const filePath = resolveWorkspaceFilePath(inputPath);
        const conversation = await conversationClient.get(conversationId);
        if (!conversation.workspace_id) {
          return undefined;
        }

        const snapshot = await workspaceClient.load(conversation.workspace_id);
        const file = snapshot?.files?.[filePath];
        if (!file) {
          return undefined;
        }

        return {
          path: filePath,
          content: Buffer.from(file.content, 'base64').toString('utf-8'),
        };
      },
    };
  }
}
