/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/public';
import type { ChartsPluginSetup } from '@kbn/charts-plugin/public';
import type { EditorFrameSetup } from '../../types';

export interface LegacyMetricVisualizationPluginSetupPlugins {
  editorFrame: EditorFrameSetup;
  charts: ChartsPluginSetup;
}

export class LegacyMetricVisualization {
  setup(core: CoreSetup, { editorFrame, charts }: LegacyMetricVisualizationPluginSetupPlugins) {
    editorFrame.registerVisualization(async () => {
      const { getLegacyMetricVisualization: getMetricVisualization } = await import(
        '../../async_services'
      );
      const paletteService = await charts.palettes.getPalettes();

      return getMetricVisualization({ paletteService });
    });
  }
}
