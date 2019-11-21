/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import KbnServer, { Server } from 'src/legacy/server/kbn_server';
import { Legacy } from 'kibana';
import { KibanaRequest } from '../../../../src/core/server';
import { SpacesServiceSetup } from '../../../plugins/spaces/server/spaces_service/spaces_service';
import { SpacesPluginSetup } from '../../../plugins/spaces/server';
// @ts-ignore
import { AuditLogger } from '../../server/lib/audit_logger';
import mappings from './mappings.json';
import { wrapError } from './server/lib/errors';
import { migrateToKibana660 } from './server/lib/migrations';
// @ts-ignore
import { watchStatusAndLicenseToInitialize } from '../../server/lib/watch_status_and_license_to_initialize';
import { initSpaceSelectorView, initEnterSpaceView } from './server/routes/views';

export interface LegacySpacesPlugin {
  getSpaceId: (request: Legacy.Request) => ReturnType<SpacesServiceSetup['getSpaceId']>;
  getActiveSpace: (request: Legacy.Request) => ReturnType<SpacesServiceSetup['getActiveSpace']>;
  spaceIdToNamespace: SpacesServiceSetup['spaceIdToNamespace'];
  namespaceToSpaceId: SpacesServiceSetup['namespaceToSpaceId'];
  getBasePath: SpacesServiceSetup['getBasePath'];
}

export const spaces = (kibana: Record<string, any>) =>
  new kibana.Plugin({
    id: 'spaces',
    configPrefix: 'xpack.spaces',
    publicDir: resolve(__dirname, 'public'),
    require: ['kibana', 'elasticsearch', 'xpack_main'],

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
          serverBasePath: server.config().get('server.basePath'),
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

      const config = server.config();

      const { registerLegacyAPI, createDefaultSpace } = spacesPlugin.__legacyCompat;

      registerLegacyAPI({
        legacyConfig: {
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
        xpackMain: server.plugins.xpack_main,
      });

      initEnterSpaceView(server);
      initSpaceSelectorView(server);

      watchStatusAndLicenseToInitialize(server.plugins.xpack_main, this, async () => {
        await createDefaultSpace();
      });

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
