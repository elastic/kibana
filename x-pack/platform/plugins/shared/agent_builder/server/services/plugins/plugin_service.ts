/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger, ElasticsearchServiceStart } from '@kbn/core/server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { createBadRequestError } from '@kbn/agent-builder-common';
import type { ParsedPluginArchive, ParsedSkillFile } from '@kbn/agent-builder-common';
import type { PersistedSkillCreateRequest } from '@kbn/agent-builder-common';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { getCurrentSpaceId } from '../../utils/spaces';
import type { PluginClient, PersistedPluginDefinition } from './client';
import { createClient, parsedArchiveToCreateRequest } from './client';
import { parsePluginFromUrl, parsePluginFromFile } from './utils';
import type { SkillClient } from '../skills/persisted/client';

type InstallPluginSource = { type: 'url'; url: string } | { type: 'file'; filePath: string };

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PluginsServiceSetup {}

export interface PluginsServiceStart {
  getScopedClient(options: { request: KibanaRequest }): PluginClient;
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
  createScopedSkillClient: (options: {
    esClient: ElasticsearchClient;
    space: string;
  }) => SkillClient;
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

  private getScopedClients({ request }: { request: KibanaRequest }): {
    pluginClient: PluginClient;
    skillClient: SkillClient;
  } {
    const { elasticsearch, logger, spaces, createScopedSkillClient } = this.getStartDeps();
    const esClient = elasticsearch.client.asScoped(request).asInternalUser;
    const space = getCurrentSpaceId({ request, spaces });

    return {
      pluginClient: createClient({ esClient, logger, space }),
      skillClient: createScopedSkillClient({ esClient, space }),
    };
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
    const { pluginClient, skillClient } = this.getScopedClients({ request });

    const existing = await pluginClient.findByName(manifest.name);
    if (existing) {
      throw createBadRequestError(
        `Plugin '${manifest.name}' is already installed (id: ${existing.id}, version: ${existing.version}).`
      );
    }

    const skillIds = parsedArchive.skills.map((skill) => `${manifest.name}-${skill.dirName}`);

    for (const skill of parsedArchive.skills) {
      await skillClient.create(toSkillCreateRequest({ skill, pluginName: manifest.name }));
    }

    const createRequest = parsedArchiveToCreateRequest({
      parsedArchive,
      sourceUrl,
      skillIds,
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
    const { pluginClient, skillClient } = this.getScopedClients({ request });
    const plugin = await pluginClient.get(pluginId);
    await skillClient.deleteByPluginId(plugin.name);
    await pluginClient.delete(pluginId);
  }
}

const toSkillCreateRequest = ({
  skill,
  pluginName,
}: {
  skill: ParsedSkillFile;
  pluginName: string;
}): PersistedSkillCreateRequest => {
  return {
    id: `${pluginName}-${skill.dirName}`,
    name: skill.meta.name ?? skill.dirName,
    description: skill.meta.description ?? '',
    content: skill.content,
    referenced_content: skill.referencedFiles.map((file) => ({
      name: file.relativePath,
      relativePath: file.relativePath,
      content: file.content,
    })),
    tool_ids: [],
    plugin_id: pluginName,
  };
};
