/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from 'src/core/public';
import { SpacesManager } from './lib';
import { initSpacesNavControl } from './views/nav_control';

export interface SpacesPluginStart {
  spacesManager: SpacesManager;
}

export class SpacesPlugin implements Plugin<{}, SpacesPluginStart> {
  private spacesManager: SpacesManager | undefined;

  // @ts-ignore
  constructor(private readonly initializerContext: PluginInitializerContext) {}

  public async start(core: CoreStart) {
    const { spaceSelectorUrl } = await core.http.get('/api/spaces/v1/npStart');
    this.spacesManager = new SpacesManager(spaceSelectorUrl, core.http, core.notifications);

    initSpacesNavControl(this.spacesManager, core);

    return {
      spacesManager: this.spacesManager,
    };
  }

  public async setup(core: CoreSetup) {}
}
