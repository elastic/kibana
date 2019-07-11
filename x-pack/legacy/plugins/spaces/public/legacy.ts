/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { npSetup, npStart } from 'ui/new_platform';
import { FeatureCatalogueRegistryProvider } from 'ui/registry/feature_catalogue';
import { plugin } from './index';
import { SpacesPlugin, PluginsSetup } from './plugin';

const spacesPlugin: SpacesPlugin = plugin({});

const plugins: PluginsSetup = {
  kibana: {
    registerCatalogueFeature: fn => {
      FeatureCatalogueRegistryProvider.register(fn);
    },
  },
};

export const setup = spacesPlugin.setup(npSetup.core);
export const start = spacesPlugin.start(npStart.core, plugins);
