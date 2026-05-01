/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Readable } from 'stream';
import path from 'path';
import { schema } from '@kbn/config-schema';
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import type { RouteDependencies } from './types';
import { getHandlerWrapper } from './wrap_handler';
import type {
  ListPluginsResponse,
  GetPluginResponse,
  InstallPluginResponse,
  DeletePluginResponse,
} from '../../common/http_api/plugins';
import { PLUGIN_USED_BY_AGENTS_ERROR_CODE } from '../../common/http_api/plugins';
import { publicApiPath, internalApiPath } from '../../common/constants';
import { toPluginDefinition } from '../services/plugins';
import { saveUploadedFile } from '../services/plugins/utils';
import { AGENT_BUILDER_READ_SECURITY, AGENT_BUILDER_WRITE_SECURITY } from './route_security';

const pluginIdParamSchema = schema.object({
  pluginId: schema.string({
    meta: { description: 'The unique identifier of the plugin.' },
  }),
});

const installPluginBodySchema = schema.object({
  url: schema.string({
    meta: { description: 'URL to install the plugin from (GitHub URL or direct zip URL).' },
  }),
  plugin_name: schema.maybe(
    schema.string({
      meta: {
        description: 'Optional name override for the plugin. Defaults to the manifest name.',
      },
    })
  ),
});

const featureFlagConfig = {
  featureFlag: AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID,
};

export function registerPluginsRoutes({ router, getInternalServices, logger }: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  // list plugins
  router.versioned
    .get({
      path: `${publicApiPath}/plugins`,
      security: AGENT_BUILDER_READ_SECURITY,
      access: 'public',
      summary: 'List plugins',
      description:
        'List all installed plugins and their managed assets. Plugins are installable packages that bundle agent capabilities such as skills, following the [Claude agent plugin specification](https://code.claude.com/docs/en/plugins).',
      options: {
        tags: ['plugins', 'oas-tag:agent builder'],
        availability: {
          stability: 'experimental',
          since: '9.4.0',
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: false,
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/plugins_list.yaml'),
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { plugins: pluginService } = getInternalServices();
        const registry = pluginService.getRegistry({ request });
        const plugins = await registry.list();
        return response.ok<ListPluginsResponse>({
          body: {
            results: plugins,
          },
        });
      }, featureFlagConfig)
    );

  // get plugin by ID
  router.versioned
    .get({
      path: `${publicApiPath}/plugins/{pluginId}`,
      security: AGENT_BUILDER_READ_SECURITY,
      access: 'public',
      summary: 'Get a plugin by id',
      description: 'Get a specific plugin by ID.',
      options: {
        tags: ['plugins', 'oas-tag:agent builder'],
        availability: {
          stability: 'experimental',
          since: '9.4.0',
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            params: pluginIdParamSchema,
          },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/plugins_get_by_id.yaml'),
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { pluginId } = request.params;
        const { plugins: pluginService } = getInternalServices();
        const registry = pluginService.getRegistry({ request });
        const plugin = await registry.get(pluginId);
        return response.ok<GetPluginResponse>({
          body: plugin,
        });
      }, featureFlagConfig)
    );

  // delete plugin by ID
  router.versioned
    .delete({
      path: `${publicApiPath}/plugins/{pluginId}`,
      security: AGENT_BUILDER_WRITE_SECURITY,
      access: 'public',
      summary: 'Delete a plugin',
      description: 'Delete an installed plugin by ID. This action cannot be undone.',
      options: {
        tags: ['plugins', 'oas-tag:agent builder'],
        availability: {
          stability: 'experimental',
          since: '9.4.0',
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            params: pluginIdParamSchema,
            query: schema.object({
              force: schema.boolean({
                defaultValue: false,
                meta: {
                  description:
                    'If true, removes the plugin skills from agents that use them and then deletes the plugin. If false and any agent uses the plugin skills, the request returns 409 Conflict with the list of agents.',
                },
              }),
            }),
          },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/plugins_delete.yaml'),
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { pluginId } = request.params;
        const { force = false } = request.query ?? {};
        const { plugins: pluginService, agents: agentsService } = getInternalServices();

        if (!force) {
          const { agents } = await agentsService.getAgentsUsingPlugins({
            request,
            pluginIds: [pluginId],
          });
          if (agents.length > 0) {
            return response.conflict({
              body: {
                message:
                  'Plugin is used by one or more agents. Use force=true to remove it from agents and delete.',
                attributes: {
                  code: PLUGIN_USED_BY_AGENTS_ERROR_CODE,
                  agents,
                },
              },
            });
          }
        } else {
          await agentsService.removePluginRefsFromAgents({
            request,
            pluginIds: [pluginId],
          });
        }

        await pluginService.deletePlugin({ request, pluginId });
        return response.ok<DeletePluginResponse>({
          body: { success: true },
        });
      }, featureFlagConfig)
    );

  // install plugin from URL
  router.versioned
    .post({
      path: `${publicApiPath}/plugins/install`,
      security: AGENT_BUILDER_WRITE_SECURITY,
      access: 'public',
      summary: 'Install a plugin',
      description:
        'Install a plugin from a [GitHub Claude plugin URL](https://code.claude.com/docs/en/plugins) or a direct ZIP URL. Plugins bundle agent capabilities such as skills.',
      options: {
        tags: ['plugins', 'oas-tag:agent builder'],
        availability: {
          stability: 'experimental',
          since: '9.4.0',
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            body: installPluginBodySchema,
          },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/plugins_install.yaml'),
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { url, plugin_name: pluginName } = request.body;
        const { plugins: pluginService } = getInternalServices();
        const plugin = await pluginService.installPlugin({
          request,
          source: { type: 'url', url },
          pluginName,
        });
        return response.ok<InstallPluginResponse>({
          body: toPluginDefinition(plugin),
        });
      }, featureFlagConfig)
    );

  // upload plugin from zip file
  router.post(
    {
      path: `${internalApiPath}/plugins/upload`,
      validate: {
        body: schema.object({
          file: schema.stream(),
          plugin_name: schema.maybe(schema.string()),
        }),
      },
      options: {
        access: 'internal',
        body: {
          accepts: ['multipart/form-data'],
          output: 'stream',
          maxBytes: 50 * 1024 * 1024,
        },
      },
      security: AGENT_BUILDER_WRITE_SECURITY,
    },
    wrapHandler(async (ctx, request, response) => {
      const { file, plugin_name: pluginName } = request.body as {
        file: Readable;
        plugin_name?: string;
      };
      const { filePath, cleanup } = await saveUploadedFile(file);
      try {
        const { plugins: pluginService } = getInternalServices();
        const plugin = await pluginService.installPlugin({
          request,
          source: { type: 'file', filePath },
          pluginName,
        });
        return response.ok<InstallPluginResponse>({
          body: toPluginDefinition(plugin),
        });
      } finally {
        await cleanup();
      }
    }, featureFlagConfig)
  );
}
