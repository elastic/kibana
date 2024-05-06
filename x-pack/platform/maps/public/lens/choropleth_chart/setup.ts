/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExpressionsSetup } from '@kbn/expressions-plugin/public';
import type { CoreSetup, CoreStart } from '@kbn/core/public';
import type { LensPublicSetup } from '@kbn/lens-plugin/public';
import type { FileLayer } from '@elastic/ems-client';
import type { MapsPluginStartDependencies } from '../../plugin';
import { getExpressionFunction } from './expression_function';
import { getExpressionRenderer } from './expression_renderer';

export function setupLensChoroplethChart(
  coreSetup: CoreSetup<MapsPluginStartDependencies>,
  expressions: ExpressionsSetup,
  lens: LensPublicSetup
) {
  expressions.registerRenderer(() => {
    return getExpressionRenderer(coreSetup);
  });

  expressions.registerFunction(getExpressionFunction);

  lens.registerVisualization(async () => {
    const [coreStart, plugins]: [CoreStart, MapsPluginStartDependencies, unknown] =
      await coreSetup.getStartServices();
    const { getEmsFileLayers } = await import('../../util');
    const { getVisualization } = await import('./visualization');

    let emsFileLayers: FileLayer[] = [];
    try {
      emsFileLayers = await getEmsFileLayers();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(
        `Lens region map setup is unable to access administrative boundaries from Elastic Maps Service (EMS). To avoid unnecessary EMS requests, set 'map.includeElasticMapsService: false' in 'kibana.yml'. For more details please visit ${coreStart.docLinks.links.maps.connectToEms}`
      );
    }

    return getVisualization({
      theme: coreStart.theme,
      emsFileLayers,
      paletteService: await plugins.charts.palettes.getPalettes(),
    });
  });
}
