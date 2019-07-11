/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from 'src/core/public';
import { FeatureCatalogueRegistryFunction } from 'ui/registry/feature_catalogue';
import { SpacesManager } from './lib';
import { initSpacesNavControl } from './views/nav_control';
import { createSpacesFeatureCatalogueEntry } from './register_feature';

export interface SpacesPluginStart {
  spacesManager: SpacesManager;
}

export interface PluginsSetup {
  kibana: {
    registerCatalogueFeature: (fn: FeatureCatalogueRegistryFunction) => void;
  };
}

export class SpacesPlugin implements Plugin<{}, SpacesPluginStart, PluginsSetup> {
  private spacesManager: SpacesManager | undefined;

  // @ts-ignore
  constructor(private readonly initializerContext: PluginInitializerContext) {}

  public async start(core: CoreStart, plugins: PluginsSetup) {
    const { spaceSelectorUrl } = await core.http.get('/api/spaces/v1/npStart');
    this.spacesManager = new SpacesManager(spaceSelectorUrl, core.http, core.notifications);

    initSpacesNavControl(this.spacesManager, core);
    plugins.kibana.registerCatalogueFeature(createSpacesFeatureCatalogueEntry);

    return {
      spacesManager: this.spacesManager,
    };
  }

  public async setup(core: CoreSetup) {}
}
