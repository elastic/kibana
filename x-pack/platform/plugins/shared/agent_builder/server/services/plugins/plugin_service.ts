/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger, ElasticsearchServiceStart } from '@kbn/core/server';
import { createBadRequestError, ParsedPluginArchive } from '@kbn/agent-builder-common';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { getCurrentSpaceId } from '../../utils/spaces';
import type { PluginClient, PersistedPluginDefinition } from './client';
import { createClient, parsedArchiveToCreateRequest } from './client';
import { parsePluginFromUrl, parsePluginFromFile } from './utils';

type InstallPluginSource = { type: 'url'; url: string } | { type: 'file'; filePath: string };

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PluginsServiceSetup {}

export interface PluginsServiceStart {
  getScopedClient(options: { request: KibanaRequest }): Promise<PluginClient>;
  installPlugin(options: {
    request: KibanaRequest;
    source: InstallPluginSource;
  }): Promise<PersistedPluginDefinition>;
  deletePlugin(options: { request: KibanaRequest; pluginId: string }): Promise<void>;
}

export interface PluginsService {
  setup(): PluginsServiceSetup;
  start(deps: PluginsServiceStartDeps): PluginsServiceStart;
}

export interface PluginsServiceStartDeps {
  logger: Logger;
  elasticsearch: ElasticsearchServiceStart;
  spaces?: SpacesPluginStart;
}

export const createPluginsService = (): PluginsService => {
  return new PluginsServiceImpl();
};

class PluginsServiceImpl implements PluginsService {
  private startDeps?: PluginsServiceStartDeps;

  setup(): PluginsServiceSetup {
    return {};
  }

  start(deps: PluginsServiceStartDeps): PluginsServiceStart {
    this.startDeps = deps;

    return {
      getScopedClient: (options) => this.getScopedClient(options),
      installPlugin: (options) => this.installPlugin(options),
      deletePlugin: (options) => this.deletePlugin(options),
    };
  }

  private getStartDeps(): PluginsServiceStartDeps {
    if (!this.startDeps) {
      throw new Error('PluginsService#start has not been called');
    }
    return this.startDeps;
  }

  private async getScopedClient({ request }: { request: KibanaRequest }): Promise<PluginClient> {
    const { elasticsearch, logger, spaces } = this.getStartDeps();
    const esClient = elasticsearch.client.asScoped(request).asInternalUser;
    const space = getCurrentSpaceId({ request, spaces });

    return createClient({ esClient, logger, space });
  }

  private async installPlugin({
    request,
    source,
  }: {
    request: KibanaRequest;
    source: InstallPluginSource;
  }): Promise<PersistedPluginDefinition> {
    let parsedArchive: ParsedPluginArchive;
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

  private async deletePlugin({
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
