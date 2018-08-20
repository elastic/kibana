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
  const PageObjects = getPageObjects(['common', 'visualize', 'header']);

  describe('visualize app', function describeIndexTests() {
    before(async function () {
      const fromTime = '2015-09-19 06:31:44.000';
      const toTime = '2015-09-23 18:31:44.000';

      await PageObjects.common.navigateToUrl('visualize', 'new');
      await PageObjects.visualize.clickVerticalBarChart();
      await PageObjects.visualize.clickNewSearch();

      log.debug('Set absolute time range from \"' + fromTime + '\" to \"' + toTime + '\"');
      await PageObjects.header.setAbsoluteRange(fromTime, toTime);
      await PageObjects.visualize.clickGo();
      await PageObjects.header.waitUntilLoadingHasFinished();
    });

    describe('inspector table', function indexPatternCreation() {

      it('should update table header when columns change', async function () {

        await PageObjects.visualize.openInspector();
        let headers = await PageObjects.visualize.getInspectorTableHeaders();
        expect(headers).to.eql(['Count']);

        log.debug('Add Average Metric on machine.ram field');
        await PageObjects.visualize.clickAddMetric();
        await PageObjects.visualize.clickBucket('Y-Axis');
        await PageObjects.visualize.selectAggregation('Average', 'metrics');
        await PageObjects.visualize.selectField('machine.ram', 'metrics');
        await PageObjects.visualize.clickGo();
        await PageObjects.visualize.openInspector();

        headers = await PageObjects.visualize.getInspectorTableHeaders();
        expect(headers).to.eql(['Count', 'Average machine.ram']);
      });
    });
  });
}
