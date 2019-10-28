/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from 'src/core/public';
import { FeatureCatalogueSetup } from 'src/plugins/feature_catalogue/public';
import { SpacesManager } from './lib';
import { initSpacesNavControl } from './views/nav_control';
import { createSpacesFeatureCatalogueEntry } from './create_feature_catalogue_entry';

export interface SpacesPluginStart {
  spacesManager: SpacesManager;
}

export interface PluginsSetup {
  feature_catalogue?: FeatureCatalogueSetup;
}

export class SpacesPlugin implements Plugin<{}, SpacesPluginStart, PluginsSetup> {
  private spacesManager: SpacesManager | undefined;

  constructor(initializerContext: PluginInitializerContext) {}

  public async start(core: CoreStart) {
    const serverBasePath = core.injectedMetadata.getInjectedVar('serverBasePath') as string;
    this.spacesManager = new SpacesManager(serverBasePath, core.http);

    initSpacesNavControl(this.spacesManager, core);

    return {
      spacesManager: this.spacesManager,
    };
  }

  public async setup(core: CoreSetup, plugins: PluginsSetup) {
    if (plugins.feature_catalogue) {
      plugins.feature_catalogue.register(createSpacesFeatureCatalogueEntry());
    }
  }
}
