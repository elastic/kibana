/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import _ from 'lodash';
import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const deployment = getService('deployment');
  const log = getService('log');
  const PageObjects = getPageObjects(['visualize']);
  let isOss = true;

  describe('chart types', function () {
    before(async function () {
      log.debug('navigateToApp visualize');
      isOss = await deployment.isOss();
      await PageObjects.visualize.navigateToNewVisualization();
    });

    it('should show the promoted vis types for the first step', async function () {
      const expectedChartTypes = ['Custom visualization', 'Lens', 'Maps', 'TSVB'];
      log.debug('oss= ' + isOss);

      // find all the chart types and make sure there all there
      const chartTypes = (await PageObjects.visualize.getPromotedVisTypes()).sort();
      log.debug('returned chart types = ' + chartTypes);
      log.debug('expected chart types = ' + expectedChartTypes);
      expect(chartTypes).to.eql(expectedChartTypes);
    });

    it('should show the correct agg based chart types', async function () {
      await PageObjects.visualize.clickAggBasedVisualizations();
      let expectedChartTypes = [
        'Area',
        'Coordinate Map',
        'Data table',
        'Gauge',
        'Goal',
        'Heat map',
        'Horizontal bar',
        'Line',
        'Metric',
        'Pie',
        'Region Map',
        'Tag cloud',
        'Timelion',
        'Vertical bar',
      ];
      if (!isOss) {
        expectedChartTypes = _.remove(expectedChartTypes, function (n) {
          return n !== 'Coordinate Map';
        });
        expectedChartTypes = _.remove(expectedChartTypes, function (n) {
          return n !== 'Region Map';
        });
        expectedChartTypes.sort();
      }
      log.debug('oss= ' + isOss);

      // find all the chart types and make sure there all there
      const chartTypes = (await PageObjects.visualize.getChartTypes()).sort();
      log.debug('returned chart types = ' + chartTypes);
      log.debug('expected chart types = ' + expectedChartTypes);
      expect(chartTypes).to.eql(expectedChartTypes);
    });
  });
}
