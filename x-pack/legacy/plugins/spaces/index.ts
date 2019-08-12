/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Rx from 'rxjs';
import { resolve } from 'path';
import KbnServer, { Server } from 'src/legacy/server/kbn_server';
import { createOptionalPlugin } from '../../server/lib/optional_plugin';
// @ts-ignore
import { AuditLogger } from '../../server/lib/audit_logger';
import mappings from './mappings.json';
import { wrapError } from './server/lib/errors';
import { getActiveSpace } from './server/lib/get_active_space';
import { getSpaceSelectorUrl } from './server/lib/get_space_selector_url';
import { migrateToKibana660 } from './server/lib/migrations';
import { plugin } from './server/new_platform';
import {
  SpacesInitializerContext,
  SpacesCoreSetup,
  SpacesHttpServiceSetup,
} from './server/new_platform/plugin';
import { initSpacesRequestInterceptors } from './server/lib/request_interceptors';
import { SecurityPlugin } from '../security';
import { SpacesServiceSetup } from './server/new_platform/spaces_service/spaces_service';

export interface SpacesPlugin {
  getSpaceId: SpacesServiceSetup['getSpaceId'];
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
      chromeNavControls: ['plugins/spaces/views/nav_control'],
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
      home: ['plugins/spaces/register_feature'],
      injectDefaultVars(server: any) {
        return {
          spaces: [],
          activeSpace: null,
          spaceSelectorURL: getSpaceSelectorUrl(server.config()),
        };
      },
      async replaceInjectedVars(
        vars: Record<string, any>,
        request: Record<string, any>,
        server: Record<string, any>
      ) {
        const spacesClient = await server.plugins.spaces.getScopedSpacesClient(request);
        try {
          vars.activeSpace = {
            valid: true,
            space: await getActiveSpace(
              spacesClient,
              request.getBasePath(),
              server.config().get('server.basePath')
            ),
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
      const initializerContext = ({
        legacyConfig: server.config(),
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
      } as unknown) as SpacesInitializerContext;

      const spacesHttpService: SpacesHttpServiceSetup = {
        ...kbnServer.newPlatform.setup.core.http,
        route: server.route.bind(server),
      };

      const core: SpacesCoreSetup = {
        http: spacesHttpService,
        elasticsearch: kbnServer.newPlatform.setup.core.elasticsearch,
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
      };

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

      const { spacesService, log } = await plugin(initializerContext).setup(core, plugins);

      initSpacesRequestInterceptors({
        config: initializerContext.legacyConfig,
        http: core.http,
        getHiddenUiAppById: server.getHiddenUiAppById,
        onPostAuth: handler => {
          server.ext('onPostAuth', handler);
        },
        log,
        spacesService,
        xpackMain: plugins.xpackMain,
      });

      server.expose('getSpaceId', (request: any) => spacesService.getSpaceId(request));
      server.expose('spaceIdToNamespace', spacesService.spaceIdToNamespace);
      server.expose('namespaceToSpaceId', spacesService.namespaceToSpaceId);
      server.expose('getBasePath', spacesService.getBasePath);
      server.expose('getScopedSpacesClient', spacesService.scopedClient);
    },
  });
