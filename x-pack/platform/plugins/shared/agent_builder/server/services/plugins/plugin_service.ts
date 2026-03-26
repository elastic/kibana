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
import type { PluginClient, PersistedPluginDefinition } from './client';
import { createClient, parsedArchiveToCreateRequest } from './client';
import { parsePluginFromUrl, parsePluginFromFile } from './utils';
import { createClient as createSkillClient } from '../skills/persisted/client';
import type { SkillClient } from '../skills/persisted/client';
import type { SkillServiceSetup } from '../skills';
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

export interface PluginsServiceSetupDeps {
  skillsSetup: SkillServiceSetup;
}

export interface PluginsServiceStart {
  getRegistry(options: { request: KibanaRequest }): PluginRegistry;
  installPlugin(options: {
    request: KibanaRequest;
    source: InstallPluginSource;
    pluginName?: string;
  }): Promise<PersistedPluginDefinition>;
  deletePlugin(options: { request: KibanaRequest; pluginId: string }): Promise<void>;
}

export interface PluginsService {
  setup(deps: PluginsServiceSetupDeps): PluginsServiceSetup;
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

interface RequestContext {
  registry: PluginRegistry;
  pluginClient: PluginClient;
  skillClient: SkillClient;
}

class PluginsServiceImpl implements PluginsService {
  private startDeps?: PluginsServiceStartDeps;
  private builtinRegistry: BuiltinPluginRegistry;

  constructor() {
    this.builtinRegistry = createBuiltinPluginRegistry();
  }

  setup({ skillsSetup }: PluginsServiceSetupDeps): PluginsServiceSetup {
    return {
      register: (plugin) => {
        if (!isAllowedBuiltinPlugin(plugin.id)) {
          throw new Error(
            `Built-in plugin with id "${plugin.id}" is not in the list of allowed built-in plugins.
             Please add it to the list of allowed built-in plugins in the "@kbn/agent-builder-server/allow_lists.ts" file.`
          );
        }
        this.builtinRegistry.register(plugin);

        if (plugin.skills) {
          for (const skill of plugin.skills) {
            skillsSetup.registerSkill(skill);
          }
        }
      },
    };
  }

  start(deps: PluginsServiceStartDeps): PluginsServiceStart {
    this.startDeps = deps;

    return {
      getRegistry: (options) => this.getRequestContext(options).registry,
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

  private getRequestContext({ request }: { request: KibanaRequest }): RequestContext {
    const { elasticsearch, logger, spaces } = this.getStartDeps();
    const esClient = elasticsearch.client.asScoped(request).asInternalUser;
    const space = getCurrentSpaceId({ request, spaces });

    const pluginClient = createClient({ esClient, logger, space });
    const skillClient = createSkillClient({ esClient, logger, space });

    const builtinProvider = createBuiltinPluginProvider({ registry: this.builtinRegistry });
    const persistedProvider = createPersistedPluginProvider({ client: pluginClient });
    const registry = createPluginRegistry({ builtinProvider, persistedProvider });

    return { registry, pluginClient, skillClient };
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
    const { registry, pluginClient, skillClient } = this.getRequestContext({ request });

    const existingPlugin = await registry.findByName(pluginName);
    if (existingPlugin) {
      if (existingPlugin.readonly) {
        throw createBadRequestError(`Plugin "${pluginName}" conflicts with a built-in plugin`);
      }
      throw createBadRequestError(
        `Plugin "${pluginName}" is already installed (id: ${existingPlugin.id}, version: ${existingPlugin.version})`
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
    const { registry, skillClient } = this.getRequestContext({ request });

    const plugin = await registry.get(pluginId);
    if (plugin.readonly) {
      throw createBadRequestError(`Plugin "${pluginId}" is read-only and can't be deleted`);
    }

    await skillClient.deleteByPluginId(plugin.id);
    await registry.delete(pluginId);
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
