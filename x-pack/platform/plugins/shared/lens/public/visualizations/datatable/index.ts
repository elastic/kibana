/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/public';
import type { ChartsPluginSetup } from '@kbn/charts-plugin/public';
import type { ExpressionsSetup } from '@kbn/expressions-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { FormatFactory } from '@kbn/visualization-ui-components';
import type { EditorFrameSetup } from '../../types';

interface DatatableVisualizationPluginStartPlugins {
  data: DataPublicPluginStart;
}
export interface DatatableVisualizationPluginSetupPlugins {
  expressions: ExpressionsSetup;
  formatFactory: FormatFactory;
  editorFrame: EditorFrameSetup;
  charts: ChartsPluginSetup;
}

export class DatatableVisualization {
  setup(
    core: CoreSetup<DatatableVisualizationPluginStartPlugins, void>,
    { expressions, formatFactory, editorFrame, charts }: DatatableVisualizationPluginSetupPlugins
  ) {
    editorFrame.registerVisualization(async () => {
      const [{ getDatatableRenderer, getDatatableVisualization }, palettes] = await Promise.all([
        import('../../async_services'),
        charts.palettes.getPalettes(),
      ]);

      expressions.registerRenderer(() =>
        getDatatableRenderer({
          formatFactory,
          core,
          getType: core
            .getStartServices()
            .then(([_, { data: dataStart }]) => dataStart.search.aggs.types.get),
          paletteService: palettes,
          uiSettings: core.uiSettings,
        })
      );

      return getDatatableVisualization({
        paletteService: palettes,
        kibanaTheme: core.theme,
        formatFactory,
      });
    });
  }
}
