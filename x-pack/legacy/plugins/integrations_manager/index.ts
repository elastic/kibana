/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import JoiNamespace from 'joi';
import { Legacy } from 'kibana';
import { LegacyPluginInitializer, LegacyPluginOptions } from 'src/legacy/types';
import { PLUGIN } from './common/constants';
import manifest from './kibana.json';
import { getConfigSchema } from './server/config';
import { Plugin, createSetupShim } from './server/plugin';
import { mappings, savedObjectSchemas } from './server/saved_objects';

const ROOT = `plugins/${PLUGIN.ID}`;

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
  init(server: Legacy.Server) {
    const { initializerContext, coreSetup, pluginsSetup } = createSetupShim(server);
    const plugin = new Plugin(initializerContext);
    plugin.setup(coreSetup, pluginsSetup);
  },
  postInit: undefined,
  isEnabled: false,
};

export const epm: LegacyPluginInitializer = kibana => new kibana.Plugin(pluginOptions);
