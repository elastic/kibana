/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import type { ExpressionsSetup } from '@kbn/expressions-plugin/public';
import type { ChartsPluginSetup } from '@kbn/charts-plugin/public';
import type { EditorFrameSetup } from '../../types';
import type { LensPluginStartDependencies } from '../../plugin';
import type { FormatFactory } from '../../../common/types';

export interface XyVisualizationPluginSetupPlugins {
  expressions: ExpressionsSetup;
  formatFactory: FormatFactory;
  editorFrame: EditorFrameSetup;
  charts: ChartsPluginSetup;
}

export class XyVisualization {
  setup(
    core: CoreSetup<LensPluginStartDependencies, void>,
    { editorFrame }: XyVisualizationPluginSetupPlugins
  ) {
    editorFrame.registerVisualization(async () => {
      const [
        coreStart,
        {
          charts,
          data,
          fieldFormats,
          eventAnnotation,
          unifiedSearch,
          savedObjectsTagging,
          dataViews,
        },
      ] = await core.getStartServices();
      const [{ getXyVisualization }, paletteService, eventAnnotationService] = await Promise.all([
        import('../../async_services'),
        charts.palettes.getPalettes(),
        eventAnnotation.getService(),
      ]);
      return getXyVisualization({
        core: coreStart,
        data,
        storage: new Storage(localStorage),
        paletteService,
        eventAnnotationService,
        fieldFormats,
        kibanaTheme: core.theme,
        unifiedSearch,
        dataViewsService: dataViews,
        savedObjectsTagging,
      });
    });
  }
}
