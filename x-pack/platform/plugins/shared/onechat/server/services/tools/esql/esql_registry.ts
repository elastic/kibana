/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger, ElasticsearchServiceStart } from '@kbn/core/server';
import { EsqlTool, RegisteredTool } from '@kbn/onechat-server';
import { esqlToolProviderId } from '@kbn/onechat-common';
import { EsqlToolClient, createClient } from './client';
import { createStorage } from './storage';
import { RegisteredToolProviderWithId } from '../types';
import { registeredToolCreator } from './utils/execute_esql_query';

export interface EsqlToolRegistry extends RegisteredToolProviderWithId {
  getScopedClient(options: { request: KibanaRequest }): Promise<EsqlToolClient>;
}

export const createEsqlToolRegistry = (
  logger: Logger,
  elasticsearch: ElasticsearchServiceStart
): EsqlToolRegistry => {
  return new EsqlToolRegistryImpl(logger, elasticsearch);
};

export class EsqlToolRegistryImpl implements EsqlToolRegistry {
  public readonly id = esqlToolProviderId;
  private readonly logger: Logger;
  private readonly elasticsearch: ElasticsearchServiceStart;

  constructor(logger: Logger, elasticsearch: ElasticsearchServiceStart) {
    this.logger = logger;
    this.elasticsearch = elasticsearch;
  }

  async has(options: { toolId: string; request: KibanaRequest }): Promise<boolean> {
    const { toolId, request } = options;
    await this.get({ toolId, request });
    return true;
  }

  async get(options: { toolId: string; request: KibanaRequest }): Promise<RegisteredTool> {
    const { toolId, request } = options;
    const client = await this.getScopedClient({ request });
    const document = await client.get(toolId);
    const tool = document;
    const executableTool = registeredToolCreator(tool);

    return executableTool as EsqlTool;
  }

  async list(options: { request: KibanaRequest }): Promise<RegisteredTool[]> {
    const client = await this.getScopedClient({ request: options.request });
    const esqlTools = await client.list();
    const registeredTools: RegisteredTool[] = [];

    for (const tool of esqlTools) {
      const executableTool = registeredToolCreator(tool);
      registeredTools.push(executableTool);
    }
    return registeredTools;
  }

  async getScopedClient({ request }: { request: KibanaRequest }): Promise<EsqlToolClient> {
    const storage = createStorage({
      logger: this.logger,
      esClient: this.elasticsearch.client.asScoped(request).asInternalUser,
    });

    const client = createClient({ storage });

    return client;
  }
}
