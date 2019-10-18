/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import JoiNamespace from 'joi';
import { BehaviorSubject } from 'rxjs';
import { LegacyPluginInitializer, LegacyPluginOptions } from 'src/legacy/types';
import { Feature } from '../../../plugins/features/server/feature';
import { PLUGIN } from './common/constants';
import manifest from './kibana.json';
import { CoreSetup, Plugin as ServerPlugin, EPMPluginInitializerContext } from './server/plugin';
import { mappings, savedObjectSchemas } from './server/saved_objects';
import { getConfigSchema } from './server/config';

const ROOT = `plugins/${PLUGIN.ID}`;

const feature: Feature = {
  id: PLUGIN.ID,
  name: PLUGIN.TITLE,
  icon: PLUGIN.ICON,
  navLinkId: PLUGIN.ID,
  app: [PLUGIN.ID, 'kibana'],
  catalogue: [PLUGIN.ID],
  privileges: {
    all: {
      api: [PLUGIN.ID],
      catalogue: [PLUGIN.ID],
      savedObject: {
        all: [],
        read: [],
      },
      ui: ['show', 'save'],
    },
    read: {
      api: [PLUGIN.ID],
      catalogue: [PLUGIN.ID],
      savedObject: {
        all: [],
        read: [],
      },
      ui: ['show'],
    },
  },
};

const pluginOptions: LegacyPluginOptions = {
  id: PLUGIN.ID,
  require: manifest.requiredPlugins,
  version: manifest.version,
  kibanaVersion: manifest.kibanaVersion,
  uiExports: {
    app: {
      title: PLUGIN.TITLE,
      description: PLUGIN.TITLE,
      main: `${ROOT}/index`,
      euiIconType: PLUGIN.ICON,
      order: 8100,
    },
    // This defines what shows up in the registry found at /app/kibana#/home and /app/kibana#/home/feature_directory
    home: [`${ROOT}/register_feature`],
    mappings,
    savedObjectSchemas,
  },
  configPrefix: PLUGIN.CONFIG_PREFIX,
  publicDir: resolve(__dirname, 'public'),
  config(Joi: typeof JoiNamespace) {
    return getConfigSchema(Joi);
  },
  deprecations: undefined,
  preInit: undefined,
  // yes, any. See https://github.com/elastic/kibana/blob/master/x-pack/legacy/plugins/infra/server/lib/adapters/configuration/kibana_configuration_adapter.ts#L49-L58
  // for a way around it, but this is Legacy Platform and I'm not sure these hoops are worth jumping through.
  init(server: any) {
    server.plugins.xpack_main.registerFeature(feature);

    const getConfig$ = () =>
      new BehaviorSubject(server.config().get(PLUGIN.CONFIG_PREFIX)).asObservable();

    const initializerContext: EPMPluginInitializerContext = {
      config: {
        create: getConfig$,
        createIfExists: getConfig$,
      },
    };

    const coreSetup: CoreSetup = {
      elasticsearch: server.newPlatform.setup.core.elasticsearch,
      hapiServer: server.newPlatform.__internals.hapiServer,
    };

    new ServerPlugin(initializerContext).setup(coreSetup);
  },
  postInit: undefined,
  isEnabled: false,
};

export const epm: LegacyPluginInitializer = kibana => new kibana.Plugin(pluginOptions);
