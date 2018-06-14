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
  const PageObjects = getPageObjects(['common', 'visualize']);

  describe('visualize app', function describeIndexTests() {

    before(function () {
      log.debug('navigateToApp visualize');
      return PageObjects.common.navigateToUrl('visualize', 'new');
    });


    describe('chart types', function indexPatternCreation() {
      it('should show the correct chart types', function () {
        const expectedChartTypes = [
          'Area',
          'Heat Map',
          'Horizontal Bar',
          'Line',
          'Pie',
          'Vertical Bar',
          'Data Table',
          'Gauge',
          'Goal',
          'Metric',
          'Coordinate Map',
          'Region Map',
          'Timelion',
          'Visual Builder',
          'Controls',
          'Markdown',
          'Tag Cloud',
          'Vega',
        ];

        // find all the chart types and make sure there all there
        return PageObjects.visualize.getChartTypes()
          .then(function testChartTypes(chartTypes) {
            log.debug('returned chart types = ' + chartTypes);
            log.debug('expected chart types = ' + expectedChartTypes);
            expect(chartTypes).to.eql(expectedChartTypes);
          });
      });
    });
  });
}
