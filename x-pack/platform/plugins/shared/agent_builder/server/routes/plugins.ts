/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
import { publicApiPath } from '../../common/constants';
import { toPluginDefinition } from '../services/plugins';
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
      description: 'List all installed plugins.',
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
      },
      wrapHandler(async (ctx, request, response) => {
        const { plugins: pluginService } = getInternalServices();
        const client = await pluginService.getScopedClient({ request });
        const plugins = await client.list();
        return response.ok<ListPluginsResponse>({
          body: {
            results: plugins.map(toPluginDefinition),
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
      },
      wrapHandler(async (ctx, request, response) => {
        const { pluginId } = request.params;
        const { plugins: pluginService } = getInternalServices();
        const client = await pluginService.getScopedClient({ request });
        const plugin = await client.get(pluginId);
        return response.ok<GetPluginResponse>({
          body: toPluginDefinition(plugin),
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
          },
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { pluginId } = request.params;
        const { plugins: pluginService } = getInternalServices();
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
      description: 'Install a plugin from a GitHub URL or a direct zip URL.',
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
      },
      wrapHandler(async (ctx, request, response) => {
        const { url } = request.body;
        const { plugins: pluginService } = getInternalServices();
        const plugin = await pluginService.installPlugin({ request, url });
        return response.ok<InstallPluginResponse>({
          body: toPluginDefinition(plugin),
        });
      }, featureFlagConfig)
    );
}
