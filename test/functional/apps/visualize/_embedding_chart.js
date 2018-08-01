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
  const filterBar = getService('filterBar');
  const log = getService('log');
  const visualization = getService('visualization');
  const embedding = getService('embedding');
  const PageObjects = getPageObjects(['common', 'visualize', 'header']);

  const fromTime = '2015-09-19 06:31:44.000';
  const toTime = '2015-09-23 18:31:44.000';

  describe('embedding', () => {

    describe('a data table', () => {
      before(async function () {
        await PageObjects.visualize.navigateToNewVisualization();
        await PageObjects.visualize.clickDataTable();
        await PageObjects.visualize.clickNewSearch();
        await PageObjects.header.setAbsoluteRange(fromTime, toTime);
        await PageObjects.visualize.clickBucket('Split Rows');
        await PageObjects.visualize.selectAggregation('Histogram');
        await PageObjects.visualize.selectField('bytes');
        await PageObjects.visualize.setNumericInterval('2000');
        await PageObjects.visualize.clickGo();
      });

      it('should allow opening table vis in embedded mode', async () => {
        await embedding.openInEmbeddedMode();
        await visualization.waitForRender();

        const data = await PageObjects.visualize.getTableVisData();
        log.debug(data.split('\n'));
        expect(data.trim().split('\n')).to.be.eql([
          '0B', '2,088',
          '1.953KB', '2,748',
          '3.906KB', '2,707',
          '5.859KB', '2,876',
          '7.813KB', '2,863',
          '9.766KB', '147',
          '11.719KB', '148',
          '13.672KB', '129',
          '15.625KB', '161',
          '17.578KB', '137'
        ]);
      });

      it('should allow to filter in embedded mode', async () => {
        await filterBar.addFilter('@timestamp', 'is between', ['2015-09-19', '2015-09-21']);
        await PageObjects.header.waitUntilLoadingHasFinished();
        await visualization.waitForRender();

        const data = await PageObjects.visualize.getTableVisData();
        log.debug(data.split('\n'));
        expect(data.trim().split('\n')).to.be.eql([
          '0B', '708',
          '1.953KB', '956',
          '3.906KB', '935',
          '5.859KB', '955',
          '7.813KB', '953',
          '9.766KB', '54',
          '11.719KB', '56',
          '13.672KB', '40',
          '15.625KB', '51',
          '17.578KB', '49'
        ]);
      });
    });
  });
}
