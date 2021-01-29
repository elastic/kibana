/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const PageObjects = getPageObjects(['common', 'visualize', 'visChart', 'visEditor', 'vegaChart']);
  const visualTesting = getService('visualTesting');

  describe('vega chart in visualize app', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('kibana_sample_data_flights');
      await esArchiver.loadIfNeeded('visualize');
    });

    after(async () => {
      await esArchiver.unload('kibana_sample_data_flights');
      await esArchiver.unload('visualize');
    });

    it('should show map with vega layer', async function () {
      await PageObjects.visualize.gotoVisualizationLandingPage();
      await PageObjects.visualize.openSavedVisualization('VegaMap');
      await PageObjects.visChart.waitForVisualizationRenderingStabilized();
      await visualTesting.snapshot();
    });
  });
}
