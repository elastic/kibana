/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import KbnServer, { Server } from 'src/legacy/server/kbn_server';
import { Legacy } from 'kibana';
import { SpacesServiceSetup } from '../../../plugins/spaces/server/spaces_service/spaces_service';
import { SpacesPluginSetup } from '../../../plugins/spaces/server';
import { createOptionalPlugin } from '../../server/lib/optional_plugin';
// @ts-ignore
import { AuditLogger } from '../../server/lib/audit_logger';
import mappings from './mappings.json';
import { wrapError } from './server/lib/errors';
import { getSpaceSelectorUrl } from './server/lib/get_space_selector_url';
import { migrateToKibana660 } from './server/lib/migrations';
import { SecurityPlugin } from '../security';
import { initSpaceSelectorView } from './server/routes/views';
// @ts-ignore
import { watchStatusAndLicenseToInitialize } from '../../server/lib/watch_status_and_license_to_initialize';

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
        request: Legacy.Request,
        server: Record<string, any>
      ) {
        const spacesPlugin = server.newPlatform.setup.plugins.spaces as SpacesPluginSetup;
        if (!spacesPlugin) {
          throw new Error('New Platform XPack Spaces plugin is not available.');
        }
        const spaceId = spacesPlugin.spacesService.getSpaceId(request);
        const spacesClient = await spacesPlugin.spacesService.scopedClient(request);
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

      const config = server.config();

      spacesPlugin.registerLegacyAPI({
        legacyConfig: {
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
        security: createOptionalPlugin<SecurityPlugin>(
          server.config(),
          'xpack.security',
          server.plugins,
          'security'
        ),
        xpackMain: server.plugins.xpack_main,
      });

      initSpaceSelectorView(server);

      watchStatusAndLicenseToInitialize(server.plugins.xpack_main, this, async () => {
        await spacesPlugin.__legacyCompat.createDefaultSpace();
      });

      server.expose('getSpaceId', (request: any) => spacesPlugin.spacesService.getSpaceId(request));
      server.expose('getActiveSpace', spacesPlugin.spacesService.getActiveSpace);
      server.expose('spaceIdToNamespace', spacesPlugin.spacesService.spaceIdToNamespace);
      server.expose('namespaceToSpaceId', spacesPlugin.spacesService.namespaceToSpaceId);
      server.expose('getBasePath', spacesPlugin.spacesService.getBasePath);
      server.expose('getScopedSpacesClient', spacesPlugin.spacesService.scopedClient);
    },
  });
