/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { resolve } from 'path';
import { LegacyPluginInitializer, LegacyPluginOptions } from 'src/legacy/types';
import KbnServer, { Server } from 'src/legacy/server/kbn_server';
import { Feature } from '../xpack_main/server/lib/feature_registry';
import { PLUGIN_ID } from './common/constants';
import manifest from './kibana.json';
import { CoreSetup, Plugin as ServerPlugin, PluginInitializerContext } from './server/plugin';
import { mappings, savedObjectSchemas } from './server/saved_objects';

const ICON = 'merge';
const ROOT = `plugins/${PLUGIN_ID}`;
const pluginTitle = i18n.translate('xpack.integrationsManager.pluginTitle', {
  defaultMessage: 'Integrations Manager',
});

const feature: Feature = {
  id: PLUGIN_ID,
  name: pluginTitle,
  icon: ICON,
  navLinkId: PLUGIN_ID,
  app: [PLUGIN_ID, 'kibana'],
  catalogue: [PLUGIN_ID],
  privileges: {
    all: {
      api: [PLUGIN_ID],
      catalogue: [PLUGIN_ID],
      savedObject: {
        all: [],
        read: [],
      },
      ui: ['show', 'save'],
    },
    read: {
      api: [PLUGIN_ID],
      catalogue: [PLUGIN_ID],
      savedObject: {
        all: [],
        read: [],
      },
      ui: ['show'],
    },
  },
};

const pluginOptions: LegacyPluginOptions = {
  id: PLUGIN_ID,
  require: manifest.requiredPlugins,
  version: manifest.version,
  kibanaVersion: manifest.kibanaVersion,
  uiExports: {
    app: {
      title: pluginTitle,
      description: pluginTitle,
      main: `${ROOT}/index`,
      euiIconType: ICON,
      order: 8100,
    },
    // This defines what shows up in the registry found at /app/kibana#/home and /app/kibana#/home/feature_directory
    home: [`${ROOT}/register_feature`],
    mappings,
    savedObjectSchemas,
  },
  configPrefix: 'xpack.integrationsManager',
  publicDir: resolve(__dirname, 'public'),
  config: undefined,
  deprecations: undefined,
  preInit: undefined,
  init(server: Server) {
    server.plugins.xpack_main.registerFeature(feature);

    // convert hapi instance to KbnServer
    // `kbnServer.server` is the same hapi instance
    // `kbnServer.newPlatform` has important values
    const kbnServer = (server as unknown) as KbnServer;
    const initializerContext: PluginInitializerContext = {};
    const coreSetup: CoreSetup = kbnServer.newPlatform.setup.core;

    new ServerPlugin(initializerContext).setup(coreSetup);
  },
  postInit: undefined,
  isEnabled: false,
};

export const integrationsManager: LegacyPluginInitializer = kibana =>
  new kibana.Plugin(pluginOptions);
