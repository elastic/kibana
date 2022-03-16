/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');
  const find = getService('find');
  const security = getService('security');
  const PageObjects = getPageObjects(['visualize']);

  const { visualize, visEditor } = getPageObjects(['visualize', 'visEditor']);

  describe('input control range', () => {
    before(async () => {
      await PageObjects.visualize.initTests();
      await security.testUser.setRoles(['kibana_admin', 'kibana_sample_admin']);
      await esArchiver.load('test/functional/fixtures/es_archiver/kibana_sample_data_flights');
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/kibana_sample_data_flights_index_pattern'
      );
      await kibanaServer.uiSettings.replace({
        defaultIndex: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
      });
      await visualize.navigateToNewVisualization();
      await visualize.clickInputControlVis();
    });

    it('should add filter with scripted field', async () => {
      await visEditor.addInputControl('range');
      await visEditor.setFilterParams(0, 'kibana_sample_data_flights', 'hour_of_day');
      await visEditor.clickGo();
      await visEditor.setFilterRange(0, '7', '10');
      await visEditor.inputControlSubmit();
      const controlFilters = await find.allByCssSelector('[data-test-subj^="filter"]');
      expect(controlFilters).to.have.length(1);
      expect(await controlFilters[0].getVisibleText()).to.equal('hour_of_day: 7 to 10');
    });

    it('should add filter with price field', async () => {
      await visEditor.addInputControl('range');
      await visEditor.setFilterParams(1, 'kibana_sample_data_flights', 'AvgTicketPrice');
      await visEditor.clickGo();
      await visEditor.setFilterRange(1, '400', '999');
      await visEditor.inputControlSubmit();
      const controlFilters = await find.allByCssSelector('[data-test-subj^="filter"]');
      expect(controlFilters).to.have.length(2);
      expect(await controlFilters[1].getVisibleText()).to.equal('AvgTicketPrice: $400 to $999');
    });

    after(async () => {
      await kibanaServer.importExport.unload(
        'test/functional/fixtures/kbn_archiver/kibana_sample_data_flights_index_pattern'
      );
      await esArchiver.unload('test/functional/fixtures/es_archiver/kibana_sample_data_flights');
      await kibanaServer.uiSettings.unset('defaultIndex');
      await security.testUser.restoreDefaults();
    });
  });
}
