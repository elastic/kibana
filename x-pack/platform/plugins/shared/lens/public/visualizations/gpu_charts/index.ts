/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/public';
import type { ExpressionsSetup } from '@kbn/expressions-plugin/public';
import type { ChartsPluginSetup } from '@kbn/charts-plugin/public';
import type { EditorFrameSetup } from '@kbn/lens-common';
import type { LensPluginStartDependencies } from '../../plugin';
import { gpuChartsExpressionFunction } from './expression';

export interface GpuChartsVisualizationPluginSetupPlugins {
  expressions: ExpressionsSetup;
  editorFrame: EditorFrameSetup;
  charts: ChartsPluginSetup;
}

export class GpuChartsVisualization {
  setup(
    core: CoreSetup<LensPluginStartDependencies, void>,
    { editorFrame, expressions, charts }: GpuChartsVisualizationPluginSetupPlugins
  ) {
    // Register the expression function
    expressions.registerFunction(() => gpuChartsExpressionFunction);

    // Register the visualization (lazy loaded)
    editorFrame.registerVisualization(async () => {
      const [coreStart, { charts: chartsStart }] = await core.getStartServices();
      // Import renderer dynamically to avoid loading deck.gl at module evaluation time
      const [visualizationModule, rendererModule, paletteService] = await Promise.all([
        import('./gpu_charts_visualization'),
        import('./renderer'),
        chartsStart.palettes.getPalettes(),
      ]);

      const { getGpuChartsVisualization } = visualizationModule;
      const { getGpuChartsRenderer } = rendererModule;

      // Register the renderer inside the visualization registration
      expressions.registerRenderer(() =>
        getGpuChartsRenderer({
          core: coreStart,
        })
      );

      return getGpuChartsVisualization({
        paletteService,
        theme: coreStart.theme,
      });
    });
  }
}

// Note: getGpuChartsVisualization is NOT exported here to avoid duplicate exports
// It is exported via async_services from gpu_charts_visualization.tsx
// Note: getGpuChartsRenderer is NOT exported here to avoid static import of deck.gl
// It is dynamically imported and registered inside the visualization setup above
export type { GpuChartsVisualizationState } from './types';
