/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import KbnServer, { Server } from 'src/legacy/server/kbn_server';
import { Legacy } from 'kibana';
import { KibanaRequest } from '../../../../src/core/server';
import { SpacesPluginSetup } from '../../../plugins/spaces/server';
import { wrapError } from './server/lib/errors';

export const spaces = (kibana: Record<string, any>) =>
  new kibana.Plugin({
    id: 'spaces',
    configPrefix: 'xpack.spaces',
    publicDir: resolve(__dirname, 'public'),
    require: ['kibana', 'elasticsearch', 'xpack_main'],
    config(Joi: any) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
      })
        .unknown()
        .default();
    },
    uiExports: {
      managementSections: [],
      apps: [],
      hacks: ['plugins/spaces/legacy'],
      home: [],
      injectDefaultVars(server: Server) {
        return {
          serverBasePath: server.config().get('server.basePath'),
          activeSpace: null,
        };
      },
      async replaceInjectedVars(
        vars: Record<string, any>,
        request: Legacy.Request,
        server: Server
      ) {
        // NOTICE: use of `activeSpace` is deprecated and will not be made available in the New Platform.
        // Known usages:
        // - x-pack/plugins/infra/public/utils/use_kibana_space_id.ts
        const spacesPlugin = server.newPlatform.setup.plugins.spaces as SpacesPluginSetup;
        if (!spacesPlugin) {
          throw new Error('New Platform XPack Spaces plugin is not available.');
        }
        const kibanaRequest = KibanaRequest.from(request);
        const spaceId = spacesPlugin.spacesService.getSpaceId(kibanaRequest);
        const spacesClient = await spacesPlugin.spacesService.scopedClient(kibanaRequest);
        try {
          vars.activeSpace = {
            valid: true,
            space: await spacesClient.get(spaceId),
          };
        } catch (e) {
          vars.activeSpace = {
            valid: false,
            error: wrapError(e).output.payload,
          };
        }

        return vars;
      },
    },

    async init(server: Server) {
      const kbnServer = (server as unknown) as KbnServer;

      const spacesPlugin = kbnServer.newPlatform.setup.plugins.spaces as SpacesPluginSetup;
      if (!spacesPlugin) {
        throw new Error('New Platform XPack Spaces plugin is not available.');
      }

      server.expose('getSpaceId', (request: Legacy.Request) =>
        spacesPlugin.spacesService.getSpaceId(request)
      );
      server.expose('getActiveSpace', (request: Legacy.Request) =>
        spacesPlugin.spacesService.getActiveSpace(request)
      );
      server.expose('spaceIdToNamespace', spacesPlugin.spacesService.spaceIdToNamespace);
      server.expose('namespaceToSpaceId', spacesPlugin.spacesService.namespaceToSpaceId);
      server.expose('getBasePath', spacesPlugin.spacesService.getBasePath);
    },
  });
