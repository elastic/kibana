/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, CoreStart, Plugin } from 'src/core/public';
import { HomePublicPluginSetup } from 'src/plugins/home/public';
import { SpacesManager } from './lib';
import { initSpacesNavControl } from './views/nav_control';
import { createSpacesFeatureCatalogueEntry } from './create_feature_catalogue_entry';

export interface SpacesPluginStart {
  spacesManager: SpacesManager | null;
}

export interface PluginsSetup {
  home?: HomePublicPluginSetup;
}

export class SpacesPlugin implements Plugin<void, SpacesPluginStart, PluginsSetup> {
  private spacesManager: SpacesManager | null = null;

  public async start(core: CoreStart) {
    const serverBasePath = core.http.basePath.get();

    this.spacesManager = new SpacesManager(serverBasePath, core.http);
    initSpacesNavControl(this.spacesManager, core);

    return {
      spacesManager: this.spacesManager,
    };
  }

  public async setup(core: CoreSetup, plugins: PluginsSetup) {
    if (plugins.home) {
      plugins.home.featureCatalogue.register(createSpacesFeatureCatalogueEntry());
    }
  }
}
