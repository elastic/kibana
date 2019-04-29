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
  const log = getService('log');
  const PageObjects = getPageObjects(['common', 'visualize']);

  describe('chart types', function () {
    before(function () {
      log.debug('navigateToApp visualize');
      return PageObjects.common.navigateToUrl('visualize', 'new');
    });

    it('should show the correct chart types', async function () {
      const expectedChartTypes = [
        'Area',
        'Controls',
        'Coordinate Map',
        'Data Table',
        'Gauge',
        'Goal',
        'Heat Map',
        'Horizontal Bar',
        'Line',
        'Markdown',
        'Metric',
        'Pie',
        'Region Map',
        'Tag Cloud',
        'Timelion',
        'Vega',
        'Vertical Bar',
        'Visual Builder',
      ];

      // find all the chart types and make sure there all there
      const chartTypes = await PageObjects.visualize.getChartTypes();
      log.debug('returned chart types = ' + chartTypes);
      log.debug('expected chart types = ' + expectedChartTypes);
      expect(chartTypes).to.eql(expectedChartTypes);
    });
  });
}
