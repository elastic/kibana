/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/public';
import type { ChartsPluginSetup } from '@kbn/charts-plugin/public';
import { FormatFactory } from '@kbn/visualization-ui-components';
import type { EditorFrameSetup } from '../../types';

export interface TagcloudVisualizationPluginSetupPlugins {
  editorFrame: EditorFrameSetup;
  charts: ChartsPluginSetup;
  formatFactory: FormatFactory;
}

export class TagcloudVisualization {
  setup(
    core: CoreSetup,
    { editorFrame, formatFactory, charts }: TagcloudVisualizationPluginSetupPlugins
  ) {
    editorFrame.registerVisualization(async () => {
      const { getTagcloudVisualization } = await import('../../async_services');
      const paletteService = await charts.palettes.getPalettes();
      return getTagcloudVisualization({ paletteService, kibanaTheme: core.theme, formatFactory });
    });
  }
}
