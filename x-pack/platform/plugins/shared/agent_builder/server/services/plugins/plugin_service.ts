/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger, ElasticsearchServiceStart } from '@kbn/core/server';
import { createBadRequestError } from '@kbn/agent-builder-common';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { getCurrentSpaceId } from '../../utils/spaces';
import type { PluginClient, PersistedPluginDefinition } from './client';
import { createClient, parsedArchiveToCreateRequest } from './client';
import { parsePluginFromUrl, parsePluginFromFile } from './utils';

type InstallPluginSource = { type: 'url'; url: string } | { type: 'file'; filePath: string };

export interface PluginService {
  getScopedClient(options: { request: KibanaRequest }): Promise<PluginClient>;
  installPlugin(options: {
    request: KibanaRequest;
    source: InstallPluginSource;
  }): Promise<PersistedPluginDefinition>;
  deletePlugin(options: { request: KibanaRequest; pluginId: string }): Promise<void>;
}

interface PluginServiceDeps {
  logger: Logger;
  elasticsearch: ElasticsearchServiceStart;
  spaces?: SpacesPluginStart;
}

export class PluginServiceImpl implements PluginService {
  private readonly logger: Logger;
  private readonly elasticsearch: ElasticsearchServiceStart;
  private readonly spaces?: SpacesPluginStart;

  constructor({ logger, elasticsearch, spaces }: PluginServiceDeps) {
    this.logger = logger;
    this.elasticsearch = elasticsearch;
    this.spaces = spaces;
  }

  async getScopedClient({ request }: { request: KibanaRequest }): Promise<PluginClient> {
    const esClient = this.elasticsearch.client.asScoped(request).asInternalUser;
    const space = getCurrentSpaceId({ request, spaces: this.spaces });

    return createClient({ esClient, logger: this.logger, space });
  }

  async installPlugin({
    request,
    source,
  }: {
    request: KibanaRequest;
    source: InstallPluginSource;
  }): Promise<PersistedPluginDefinition> {
    let parsedArchive;
    let sourceUrl: string | undefined;

    if (source.type === 'url') {
      parsedArchive = await parsePluginFromUrl(source.url);
      sourceUrl = source.url;
    } else {
      parsedArchive = await parsePluginFromFile(source.filePath);
    }

    const { manifest } = parsedArchive;
    const client = await this.getScopedClient({ request });

    const existing = await client.findByName(manifest.name);
    if (existing) {
      throw createBadRequestError(
        `Plugin '${manifest.name}' is already installed (id: ${existing.id}, version: ${existing.version}).`
      );
    }

    const createRequest = parsedArchiveToCreateRequest({
      parsedArchive,
      sourceUrl,
    });

    return client.create(createRequest);
  }

  async deletePlugin({
    request,
    pluginId,
  }: {
    request: KibanaRequest;
    pluginId: string;
  }): Promise<void> {
    const client = await this.getScopedClient({ request });
    await client.delete(pluginId);
  }
}
