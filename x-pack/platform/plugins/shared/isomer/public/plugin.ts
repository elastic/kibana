/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import { AppStatus } from '@kbn/core/public';

export class IsomerPublicPlugin implements Plugin {
  constructor(private readonly initializerContext: PluginInitializerContext) {}

  setup(core: CoreSetup<{ charts: ChartsPluginStart }>) {
    // A dev-only bench that draws exported compositions with the Elastic Charts engine, for comparison with Lens.
    if (this.initializerContext.env.mode.dev) {
      core.application.register({
        id: 'isomerChartsBench',
        title: 'Isomer charts bench',
        visibleIn: [],
        status: AppStatus.accessible,
        mount: async (params) => {
          const [[coreStart, { charts }], { renderChartsBench }] = await Promise.all([
            core.getStartServices(),
            import('./charts_bench/app'),
          ]);
          return renderChartsBench(coreStart, charts, params.element);
        },
      });
    }
    return {};
  }

  start() {
    return {};
  }

  stop() {}
}
