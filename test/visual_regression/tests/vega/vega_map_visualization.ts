/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['common', 'visualize', 'visChart', 'visEditor', 'vegaChart']);
  const visualTesting = getService('visualTesting');

  describe('vega chart in visualize app', () => {
    before(async () => {
      await esArchiver.loadIfNeeded(
        'test/functional/fixtures/es_archiver/kibana_sample_data_flights'
      );
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/visualize.json');
    });

    after(async () => {
      await esArchiver.unload('test/functional/fixtures/es_archiver/kibana_sample_data_flights');
      await kibanaServer.importExport.unload(
        'test/functional/fixtures/kbn_archiver/visualize.json'
      );
    });

    it('should show map with vega layer', async function () {
      await PageObjects.visualize.gotoVisualizationLandingPage();
      await PageObjects.visualize.openSavedVisualization('VegaMap');
      await PageObjects.visChart.waitForVisualizationRenderingStabilized();
      await visualTesting.snapshot();
    });
  });
}
