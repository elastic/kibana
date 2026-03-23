/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import type { KibanaRequest, Logger, ElasticsearchServiceStart } from '@kbn/core/server';
import { createBadRequestError } from '@kbn/agent-builder-common';
import type { ParsedPluginArchive, ParsedSkillFile } from '@kbn/agent-builder-common';
import type { PersistedSkillCreateRequest } from '@kbn/agent-builder-common';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { isAllowedBuiltinPlugin } from '@kbn/agent-builder-server/allow_lists';
import type { BuiltInPluginDefinition } from '@kbn/agent-builder-server/plugins';
import type { AgentBuilderConfig } from '../../config';
import { getCurrentSpaceId } from '../../utils/spaces';
import type { PersistedPluginDefinition } from './client';
import { createClient, parsedArchiveToCreateRequest } from './client';
import { parsePluginFromUrl, parsePluginFromFile } from './utils';
import { createClient as createSkillClient } from '../skills/persisted/client';
import {
  createBuiltinPluginRegistry,
  createBuiltinPluginProvider,
  type BuiltinPluginRegistry,
} from './builtin';
import { createPersistedPluginProvider } from './persisted';
import { createPluginRegistry, type PluginRegistry } from './plugin_registry';

type InstallPluginSource = { type: 'url'; url: string } | { type: 'file'; filePath: string };

export interface PluginsServiceSetup {
  register: (plugin: BuiltInPluginDefinition) => void;
}

export interface PluginsServiceStart {
  getRegistry(options: { request: KibanaRequest }): PluginRegistry;
  getScopedClient(options: { request: KibanaRequest }): ReturnType<typeof createClient>;
  installPlugin(options: {
    request: KibanaRequest;
    source: InstallPluginSource;
    pluginName?: string;
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
  config: AgentBuilderConfig;
}

export const createPluginsService = (): PluginsService => {
  return new PluginsServiceImpl();
};

class PluginsServiceImpl implements PluginsService {
  private startDeps?: PluginsServiceStartDeps;
  private builtinRegistry: BuiltinPluginRegistry;

  constructor() {
    this.builtinRegistry = createBuiltinPluginRegistry();
  }

  setup(): PluginsServiceSetup {
    return {
      register: (plugin) => {
        if (!isAllowedBuiltinPlugin(plugin.id)) {
          throw new Error(
            `Built-in plugin with id "${plugin.id}" is not in the list of allowed built-in plugins.
             Please add it to the list of allowed built-in plugins in the "@kbn/agent-builder-server/allow_lists.ts" file.`
          );
        }
        this.builtinRegistry.register(plugin);
      },
    };
  }

  start(deps: PluginsServiceStartDeps): PluginsServiceStart {
    this.startDeps = deps;

    return {
      getRegistry: (options) => this.getRegistry(options),
      getScopedClient: (options) => this.getScopedClients(options).pluginClient,
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

  private getRegistry({ request }: { request: KibanaRequest }): PluginRegistry {
    const { elasticsearch, logger, spaces } = this.getStartDeps();
    const esClient = elasticsearch.client.asScoped(request).asInternalUser;
    const space = getCurrentSpaceId({ request, spaces });
    const pluginClient = createClient({ esClient, logger, space });

    const builtinProvider = createBuiltinPluginProvider({ registry: this.builtinRegistry });
    const persistedProvider = createPersistedPluginProvider({ client: pluginClient });

    return createPluginRegistry({ builtinProvider, persistedProvider });
  }

  private getScopedClients({ request }: { request: KibanaRequest }) {
    const { elasticsearch, logger, spaces } = this.getStartDeps();
    const esClient = elasticsearch.client.asScoped(request).asInternalUser;
    const space = getCurrentSpaceId({ request, spaces });

    return {
      pluginClient: createClient({ esClient, logger, space }),
      skillClient: createSkillClient({ esClient, logger, space }),
    };
  }

  private async installPlugin({
    request,
    source,
    pluginName: pluginNameOverride,
  }: {
    request: KibanaRequest;
    source: InstallPluginSource;
    pluginName?: string;
  }): Promise<PersistedPluginDefinition> {
    let parsedArchive: ParsedPluginArchive;
    let sourceUrl: string | undefined;

    if (source.type === 'url') {
      const { config } = this.getStartDeps();
      parsedArchive = await parsePluginFromUrl(source.url, { githubBaseUrl: config.githubBaseUrl });
      sourceUrl = source.url;
    } else {
      parsedArchive = await parsePluginFromFile(source.filePath);
    }

    const pluginName = pluginNameOverride ?? parsedArchive.manifest.name;

    const registry = this.getRegistry({ request });
    if (await registry.has(pluginName)) {
      throw createBadRequestError(
        `Plugin '${pluginName}' is already installed or is a built-in plugin.`
      );
    }

    const { pluginClient, skillClient } = this.getScopedClients({ request });

    const existing = await pluginClient.findByName(pluginName);
    if (existing) {
      throw createBadRequestError(
        `Plugin '${pluginName}' is already installed (id: ${existing.id}, version: ${existing.version}).`
      );
    }

    const pluginId = randomUUID();

    const createRequests = parsedArchive.skills.map((skill) =>
      toSkillCreateRequest({ skill, pluginName, pluginId })
    );
    await skillClient.bulkCreate(createRequests);

    const skillIds = createRequests.map((req) => req.id);

    const createRequest = parsedArchiveToCreateRequest({
      parsedArchive,
      sourceUrl,
      skillIds,
      nameOverride: pluginNameOverride,
      id: pluginId,
    });

    return pluginClient.create(createRequest);
  }

  private async deletePlugin({
    request,
    pluginId,
  }: {
    request: KibanaRequest;
    pluginId: string;
  }): Promise<void> {
    const registry = this.getRegistry({ request });

    const plugin = await registry.get(pluginId);
    if (plugin.readonly) {
      throw createBadRequestError(`Plugin '${pluginId}' is read-only and can't be deleted`);
    }

    const { pluginClient, skillClient } = this.getScopedClients({ request });
    const plugin = await pluginClient.get(pluginId);
    await skillClient.deleteByPluginId(plugin.id);
    await pluginClient.delete(pluginId);
  }
}

const toSkillCreateRequest = ({
  skill,
  pluginName,
  pluginId,
}: {
  skill: ParsedSkillFile;
  pluginName: string;
  pluginId: string;
}): PersistedSkillCreateRequest => {
  return {
    id: `${pluginName}-${skill.dirName}`,
    name: skill.meta.name ?? skill.dirName,
    base_path: `/skills/${pluginName}`,
    description: skill.meta.description ?? '',
    content: skill.content,
    referenced_content: skill.referencedFiles.map((file) => ({
      name: file.relativePath,
      relativePath: file.relativePath,
      content: file.content,
    })),
    tool_ids: [],
    plugin_id: pluginId,
  };
};
