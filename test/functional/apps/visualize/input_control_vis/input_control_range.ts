/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const find = getService('find');
  const security = getService('security');
  const { visualize, visEditor } = getPageObjects(['visualize', 'visEditor']);

  describe('input control range', () => {
    before(async () => {
      await security.testUser.setRoles(['kibana_admin', 'kibana_sample_admin']);
      await esArchiver.load('kibana_sample_data_flights_index_pattern');
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
      await esArchiver.unload('kibana_sample_data_flights_index_pattern');
      // loading back default data
      await esArchiver.loadIfNeeded('logstash_functional');
      await esArchiver.loadIfNeeded('long_window_logstash');
      await esArchiver.load('visualize');
      await kibanaServer.uiSettings.replace({ defaultIndex: 'logstash-*' });
      await security.testUser.restoreDefaults();
    });
  });
}
