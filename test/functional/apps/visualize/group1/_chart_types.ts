/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const log = getService('log');
  const { visualize } = getPageObjects(['visualize']);

  describe('chart types', function () {
    before(async function () {
      await visualize.initTests();
      log.debug('navigateToApp visualize');
      await visualize.navigateToNewVisualization();
    });

    it('should show the expected visualizations types for both recommended and legacy tabs', async function () {
      const expectedRecommendedChartTypes = ['Custom visualization', 'Lens', 'Maps'];
      const expectedLegacyChartTypes = ['Aggregation-based', 'TSVB'];

      // find all the chart types and make sure there all there
      const chartTypes = await visualize.getVisibleVisTypes();
      log.debug('returned chart types = ' + chartTypes);
      log.debug('expected chart types = ' + expectedRecommendedChartTypes);
      expect(chartTypes).to.eql(expectedRecommendedChartTypes);
      await visualize.clickLegacyTab();
      const legacyChartTypes = await visualize.getVisibleVisTypes();
      expect(legacyChartTypes).to.eql(expectedLegacyChartTypes);
    });

    it('should show the correct agg based chart types', async function () {
      await visualize.clickAggBasedVisualizations();
      const expectedChartTypes = [
        'Area',
        'Data table',
        'Gauge',
        'Goal',
        'Heat map',
        'Horizontal bar',
        'Line',
        'Metric',
        'Pie',
        'Tag cloud',
        'Timelion',
        'Vertical bar',
      ];

      // find all the chart types and make sure there all there
      const chartTypes = (await visualize.getChartTypes()).sort();
      log.debug('returned chart types = ' + chartTypes);
      log.debug('expected chart types = ' + expectedChartTypes);
      expect(chartTypes).to.eql(expectedChartTypes);
    });
  });
}
