/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin as DataPlugin } from 'src/plugins/data/public';
import { Plugin, CoreStart, CoreSetup } from '../../../../../src/core/public';

export interface MlSetupDependencies {
  npData: ReturnType<DataPlugin['start']>;
}

export class MlPlugin implements Plugin<MlPluginSetup, MlPluginStart> {
  setup(core: CoreSetup, { npData }: MlSetupDependencies) {
    core.application.register({
      id: 'ml',
      title: 'Machine learning',
      async mount(context, params) {
        const [coreStart, depsStart] = await core.getStartServices();
        const { renderApp } = await import('./application/app');
        return renderApp(coreStart, depsStart, {
          ...params,
          indexPatterns: npData.indexPatterns,
          npData,
        });
      },
    });

    return {};
  }

  start(core: CoreStart, deps: {}) {
    return {};
  }
  public stop() {}
}

export type MlPluginSetup = ReturnType<MlPlugin['setup']>;
export type MlPluginStart = ReturnType<MlPlugin['start']>;
