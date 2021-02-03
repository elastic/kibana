/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { CoreSetup, CoreStart, PluginInitializerContext } from 'src/core/public';
import { ExpressionsStart } from './types';
import { setExpressions } from './services';

export interface StartDeps {
  expressions: ExpressionsStart;
}

export class Plugin {
  constructor(initializerContext: PluginInitializerContext) {}

  public setup({ application }: CoreSetup) {
    application.register({
      id: 'kbn_tp_run_pipeline',
      title: 'Run Pipeline',
      async mount(params) {
        const { renderApp } = await import('./app/app');
        return renderApp(params);
      },
    });
  }

  public start(start: CoreStart, { expressions }: StartDeps) {
    setExpressions(expressions);
  }
}
