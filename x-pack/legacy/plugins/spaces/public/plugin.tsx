/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializerContext, CoreSetup, CoreStart } from 'src/core/public';
import { initSpacesManager } from './lib';
import { initSpacesNavControl } from './views/nav_control';

export class Plugin {
  // @ts-ignore
  constructor(private readonly initializerContext: PluginInitializerContext) {}

  public async start(core: CoreStart) {
    const { spaceSelectorUrl } = await core.http.get('/api/spaces/v1/npStart');
    const spacesManager = initSpacesManager(spaceSelectorUrl, core.http, core.notifications);

    initSpacesNavControl(spacesManager, core);
  }

  public async setup(core: CoreSetup) {}
}
