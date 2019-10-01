/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Rx from 'rxjs';
import { resolve } from 'path';
import KbnServer, { Server } from 'src/legacy/server/kbn_server';
import { CoreSetup, PluginInitializerContext } from 'src/core/server';
import { createOptionalPlugin } from '../../server/lib/optional_plugin';
// @ts-ignore
import { AuditLogger } from '../../server/lib/audit_logger';
import mappings from './mappings.json';
import { migrateToKibana660 } from './server/lib/migrations';
import { plugin } from './server/new_platform';
import { SecurityPlugin } from '../security';
import { SpacesServiceSetup } from './server/new_platform/spaces_service/spaces_service';
import { initSpaceSelectorView } from './server/routes/views';

export interface SpacesPlugin {
  getSpaceId: SpacesServiceSetup['getSpaceId'];
  getActiveSpace: SpacesServiceSetup['getActiveSpace'];
  spaceIdToNamespace: SpacesServiceSetup['spaceIdToNamespace'];
  namespaceToSpaceId: SpacesServiceSetup['namespaceToSpaceId'];
  getBasePath: SpacesServiceSetup['getBasePath'];
  getScopedSpacesClient: SpacesServiceSetup['scopedClient'];
}

export const spaces = (kibana: Record<string, any>) =>
  new kibana.Plugin({
    id: 'spaces',
    configPrefix: 'xpack.spaces',
    publicDir: resolve(__dirname, 'public'),
    require: ['kibana', 'elasticsearch', 'xpack_main'],

    config(Joi: any) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
        maxSpaces: Joi.number().default(1000),
      }).default();
    },

    uiCapabilities() {
      return {
        spaces: {
          manage: true,
        },
        management: {
          kibana: {
            spaces: true,
          },
        },
      };
    },

    uiExports: {
      styleSheetPaths: resolve(__dirname, 'public/index.scss'),
      managementSections: ['plugins/spaces/views/management'],
      apps: [
        {
          id: 'space_selector',
          title: 'Spaces',
          main: 'plugins/spaces/views/space_selector',
          url: 'space_selector',
          hidden: true,
        },
      ],
      hacks: [],
      mappings,
      migrations: {
        space: {
          '6.6.0': migrateToKibana660,
        },
      },
      savedObjectSchemas: {
        space: {
          isNamespaceAgnostic: true,
          hidden: true,
        },
      },
      home: ['plugins/spaces/legacy'],
    },

    async init(server: Server) {
      const kbnServer = (server as unknown) as KbnServer;
      const initializerContext = {
        config: {
          create: () => {
            return Rx.of({
              maxSpaces: server.config().get('xpack.spaces.maxSpaces'),
            });
          },
        },
        logger: {
          get(...contextParts: string[]) {
            return kbnServer.newPlatform.coreContext.logger.get(
              'plugins',
              'spaces',
              ...contextParts
            );
          },
        },
      } as PluginInitializerContext;

      const core = (kbnServer.newPlatform.setup.core as unknown) as CoreSetup;

      const plugins = {
        xpackMain: server.plugins.xpack_main,
        // TODO: Spaces has a circular dependency with Security right now.
        // Security is not yet available when init runs, so this is wrapped in an optional function for the time being.
        security: createOptionalPlugin<SecurityPlugin>(
          server.config(),
          'xpack.security',
          server.plugins,
          'security'
        ),
        spaces: this,
      };

      const { spacesService, registerLegacyAPI } = await plugin(initializerContext).setup(
        core,
        plugins
      );

      const config = server.config();

      registerLegacyAPI({
        router: server.route.bind(server),
        legacyConfig: {
          serverBasePath: config.get('server.basePath'),
          serverDefaultRoute: config.get('server.defaultRoute'),
          kibanaIndex: config.get('kibana.index'),
        },
        savedObjects: server.savedObjects,
        usage: server.usage,
        tutorial: {
          addScopedTutorialContextFactory: server.addScopedTutorialContextFactory,
        },
        capabilities: {
          registerCapabilitiesModifier: server.registerCapabilitiesModifier,
        },
        auditLogger: {
          create: (pluginId: string) =>
            new AuditLogger(server, pluginId, server.config(), server.plugins.xpack_main.info),
        },
      });

      initSpaceSelectorView(server);

      server.expose('getSpaceId', (request: any) => spacesService.getSpaceId(request));
      server.expose('getActiveSpace', spacesService.getActiveSpace);
      server.expose('spaceIdToNamespace', spacesService.spaceIdToNamespace);
      server.expose('namespaceToSpaceId', spacesService.namespaceToSpaceId);
      server.expose('getBasePath', spacesService.getBasePath);
      server.expose('getScopedSpacesClient', spacesService.scopedClient);
    },
  });
