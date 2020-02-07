/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const find = getService('find');
  const { visualize, visEditor } = getPageObjects(['visualize', 'visEditor']);

  describe('input control range', () => {
    before(async () => {
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
    });
  });
}
