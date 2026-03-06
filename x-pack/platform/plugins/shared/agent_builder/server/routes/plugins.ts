/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Readable } from 'stream';
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
        const plugin = await pluginService.installPlugin({
          request,
          source: { type: 'url', url },
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
      const { file } = request.body as { file: Readable };
      const { filePath, cleanup } = await saveUploadedFile(file);
      try {
        const { plugins: pluginService } = getInternalServices();
        const plugin = await pluginService.installPlugin({
          request,
          source: { type: 'file', filePath },
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
