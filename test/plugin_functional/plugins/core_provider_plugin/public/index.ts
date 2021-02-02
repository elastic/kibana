/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Plugin, CoreSetup, CoreStart } from 'kibana/public';
import '../types';

export const plugin = () => new CoreProviderPlugin();

class CoreProviderPlugin implements Plugin {
  private setupDeps?: { core: CoreSetup; plugins: Record<string, any> };
  public setup(core: CoreSetup, plugins: Record<string, any>) {
    this.setupDeps = {
      core,
      plugins,
    };
  }

  public start(core: CoreStart, plugins: Record<string, any>) {
    window._coreProvider = {
      setup: this.setupDeps!,
      start: {
        core,
        plugins,
      },
      testUtils: {
        delay: (ms: number) => new Promise((res) => setTimeout(res, ms)),
      },
    };
  }
  public stop() {}
}
