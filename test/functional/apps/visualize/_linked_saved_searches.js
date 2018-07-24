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

export default function ({ getPageObjects }) {
  const PageObjects = getPageObjects(['common', 'discover', 'visualize', 'header']);

  // Blocked by: https://github.com/elastic/kibana/issues/19750
  describe.skip('visualize app', function describeIndexTests() {
    const fromTime = '2015-09-19 06:31:44.000';
    const toTime = '2015-09-23 18:31:44.000';

    describe('linked saved searched', () => {

      const savedSearchName = 'vis_saved_search';

      before(async () => {
        await PageObjects.common.navigateToUrl('discover', '');
        await PageObjects.discover.saveSearch(savedSearchName);
      });

      it('should create a visualization from a saved search', async () => {
        await PageObjects.visualize.navigateToNewVisualization();
        await PageObjects.visualize.clickDataTable();
        await PageObjects.visualize.clickSavedSearch(savedSearchName);
        await PageObjects.header.setAbsoluteRange(fromTime, toTime);
        await PageObjects.header.waitUntilLoadingHasFinished();
        const data = await PageObjects.visualize.getTableVisData();
        expect(data.trim()).to.be('14,004');
      });

      it('should respect the time filter when linked to a saved search', async () => {
        await PageObjects.header.setAbsoluteRange('2015-09-19 06:31:44.000', '2015-09-21 10:00:00.000');
        await PageObjects.header.waitUntilLoadingHasFinished();
        const data = await PageObjects.visualize.getTableVisData();
        expect(data.trim()).to.be('6,086');
      });
    });

    after(async () => {
      await PageObjects.header.setAbsoluteRange(fromTime, toTime);
    });
  });
}
