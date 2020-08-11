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
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const PageObjects = getPageObjects([
    'timePicker',
    'visualize',
    'visChart',
    'visEditor',
    'vegaChart',
  ]);
  const filterBar = getService('filterBar');
  const log = getService('log');

  describe('vega chart in visualize app', () => {
    before(async () => {
      log.debug('navigateToApp visualize');
      await PageObjects.visualize.navigateToNewVisualization();
      log.debug('clickVega');
      await PageObjects.visualize.clickVega();
      await PageObjects.visChart.waitForVisualizationRenderingStabilized();
    });

    describe('vega chart', () => {
      describe('initial render', () => {
        it('should have some initial vega spec text', async function () {
          const vegaSpec = await PageObjects.vegaChart.getSpec();
          expect(vegaSpec).to.contain('{');
          expect(vegaSpec).to.contain('data');
          expect(vegaSpec.length).to.be.above(500);
        });

        it('should have view and control containers', async function () {
          const view = await PageObjects.vegaChart.getViewContainer();
          expect(view).to.be.ok();
          const size = await view.getSize();
          expect(size).to.have.property('width');
          expect(size).to.have.property('height');
          expect(size.width).to.be.above(0);
          expect(size.height).to.be.above(0);

          const controls = await PageObjects.vegaChart.getControlContainer();
          expect(controls).to.be.ok();
        });
      });

      describe('with filters', () => {
        before(async () => {
          log.debug('setAbsoluteRange');
          await PageObjects.timePicker.setDefaultAbsoluteRange();
        });

        afterEach(async () => {
          await filterBar.removeAllFilters();
        });

        it('should render different data in response to filter change', async function () {
          await PageObjects.vegaChart.typeInSpec('"config": { "kibana": {"renderer": "svg"} },');
          await PageObjects.visEditor.clickGo();
          await PageObjects.visChart.waitForVisualizationRenderingStabilized();
          const fullDataLabels = await PageObjects.vegaChart.getYAxisLabels();
          expect(fullDataLabels[0]).to.eql('0');
          expect(fullDataLabels[fullDataLabels.length - 1]).to.eql('1,600');
          await filterBar.addFilter('@tags.raw', 'is', 'error');
          await PageObjects.visChart.waitForVisualizationRenderingStabilized();
          const filteredDataLabels = await PageObjects.vegaChart.getYAxisLabels();
          expect(filteredDataLabels[0]).to.eql('0');
          expect(filteredDataLabels[filteredDataLabels.length - 1]).to.eql('90');
        });
      });
    });
  });
}
