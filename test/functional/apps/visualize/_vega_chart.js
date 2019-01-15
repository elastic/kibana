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

import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const log = getService('log');
  const inspector = getService('inspector');
  const PageObjects = getPageObjects(['common', 'visualize', 'header']);

  describe('visualize app', () => {
    before(async () => {
      log.debug('navigateToApp visualize');
      await PageObjects.visualize.navigateToNewVisualization();
      log.debug('clickVega');
      await PageObjects.visualize.clickVega();
    });

    describe('vega chart', () => {
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
  });
}
