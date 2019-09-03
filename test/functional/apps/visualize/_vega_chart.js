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

export default function ({ getService, getPageObjects }) {
  const PageObjects = getPageObjects(['common', 'header', 'timePicker', 'visualize']);
  const filterBar = getService('filterBar');
  const inspector = getService('inspector');
  const log = getService('log');

  const fromTime = '2015-09-19 06:31:44.000';
  const toTime = '2015-09-23 18:31:44.000';

  describe('visualize app', () => {
    before(async () => {
      log.debug('navigateToApp visualize');
      await PageObjects.visualize.navigateToNewVisualization();
      log.debug('clickVega');
      await PageObjects.visualize.clickVega();
    });

    describe('vega chart', () => {
      describe('initial render', () => {
        it('should not have inspector enabled', async function () {
          await inspector.expectIsNotEnabled();
        });

        it.skip('should have some initial vega spec text', async function () {
          const vegaSpec = await PageObjects.visualize.getVegaSpec();
          expect(vegaSpec).to.contain('{').and.to.contain('data');
          expect(vegaSpec.length).to.be.above(500);
        });

        it('should have view and control containers', async function () {
          const view = await PageObjects.visualize.getVegaViewContainer();
          expect(view).to.be.ok();
          const size = await view.getSize();
          expect(size).to.have.property('width').and.to.have.property('height');
          expect(size.width).to.be.above(0);
          expect(size.height).to.be.above(0);

          const controls = await PageObjects.visualize.getVegaControlContainer();
          expect(controls).to.be.ok();
        });
      });

      describe('with filters', () => {
        before(async () => {
          log.debug('setAbsoluteRange');
          await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
        });

        afterEach(async () => {
          await filterBar.removeAllFilters();
        });

        it.skip('should render different data in response to filter change', async function () {
          await PageObjects.visualize.expectVisToMatchScreenshot('vega_chart');
          await filterBar.addFilter('@tags.raw', 'is', 'error');
          await PageObjects.visualize.expectVisToMatchScreenshot('vega_chart_filtered');
        });
      });
    });
  });
}
