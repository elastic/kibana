/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const log = getService('log');
  const PageObjects = getPageObjects(['visualize', 'visEditor', 'visChart', 'timePicker']);

  describe('new charts line charts - split chart switch between Y axis scale types', () => {
    before(async () => {
      log.debug('navigateToApp visualize');
      await PageObjects.visualize.navigateToNewAggBasedVisualization();
      log.debug('clickLineChart');
      await PageObjects.visualize.clickLineChart();
      await PageObjects.visualize.clickNewSearch();
      await PageObjects.timePicker.setDefaultAbsoluteRange();
      log.debug('Bucket = Split chart');
      await PageObjects.visEditor.clickBucket('Split chart');
      log.debug('Aggregation = Terms');
      await PageObjects.visEditor.selectAggregation('Terms');
      log.debug('Field = extension');
      await PageObjects.visEditor.selectField('extension.raw');
      log.debug('switch from Rows to Columns');
      await PageObjects.visEditor.clickSplitDirection('Columns');
      await PageObjects.visEditor.clickGo();
    });

    const axisId = 'ValueAxis-1';

    it('should show ticks on selecting log scale', async () => {
      await PageObjects.visEditor.clickMetricsAndAxes();
      await PageObjects.visEditor.clickYAxisOptions(axisId);
      await PageObjects.visEditor.selectYAxisScaleType(axisId, 'log');
      await PageObjects.visEditor.changeYAxisFilterLabelsCheckbox(axisId, false);
      await PageObjects.visEditor.clickGo();
      const labels = await PageObjects.visChart.getYAxisLabelsAsNumbers();
      const minLabel = 1;
      const maxLabel = 7000;
      const numberOfLabels = 10;
      expect(labels.length).to.be.greaterThan(numberOfLabels);
      expect(labels[0]).to.eql(minLabel);
      expect(labels[labels.length - 1]).to.be.greaterThan(maxLabel);
    });

    it('should show filtered ticks on selecting log scale', async () => {
      await PageObjects.visEditor.changeYAxisFilterLabelsCheckbox(axisId, true);
      await PageObjects.visEditor.clickGo();
      const labels = await PageObjects.visChart.getYAxisLabelsAsNumbers();
      const minLabel = 1;
      const maxLabel = 7000;
      const numberOfLabels = 10;
      expect(labels.length).to.be.greaterThan(numberOfLabels);
      expect(labels[0]).to.eql(minLabel);
      expect(labels[labels.length - 1]).to.be.greaterThan(maxLabel);
    });

    it('should show ticks on selecting square root scale', async () => {
      await PageObjects.visEditor.selectYAxisScaleType(axisId, 'square root');
      await PageObjects.visEditor.changeYAxisFilterLabelsCheckbox(axisId, false);
      await PageObjects.visEditor.clickGo();
      const labels = await PageObjects.visChart.getYAxisLabels();
      const expectedLabels = [
        '0',
        '1,000',
        '2,000',
        '3,000',
        '4,000',
        '5,000',
        '6,000',
        '7,000',
        '8,000',
        '9,000',
      ];

      expect(labels).to.eql(expectedLabels);
    });

    it('should show filtered ticks on selecting square root scale', async () => {
      await PageObjects.visEditor.changeYAxisFilterLabelsCheckbox(axisId, true);
      await PageObjects.visEditor.clickGo();
      const labels = await PageObjects.visChart.getYAxisLabels();
      const expectedLabels = [
        '0',
        '1,000',
        '2,000',
        '3,000',
        '4,000',
        '5,000',
        '6,000',
        '7,000',
        '8,000',
        '9,000',
      ];
      expect(labels).to.eql(expectedLabels);
    });

    it('should show ticks on selecting linear scale', async () => {
      await PageObjects.visEditor.selectYAxisScaleType(axisId, 'linear');
      await PageObjects.visEditor.changeYAxisFilterLabelsCheckbox(axisId, false);
      await PageObjects.visEditor.clickGo();
      const labels = await PageObjects.visChart.getYAxisLabels();
      log.debug(labels);
      const expectedLabels = [
        '0',
        '1,000',
        '2,000',
        '3,000',
        '4,000',
        '5,000',
        '6,000',
        '7,000',
        '8,000',
        '9,000',
      ];
      expect(labels).to.eql(expectedLabels);
    });

    it('should show filtered ticks on selecting linear scale', async () => {
      await PageObjects.visEditor.changeYAxisFilterLabelsCheckbox(axisId, true);
      await PageObjects.visEditor.clickGo();
      const labels = await PageObjects.visChart.getYAxisLabels();
      const expectedLabels = [
        '0',
        '1,000',
        '2,000',
        '3,000',
        '4,000',
        '5,000',
        '6,000',
        '7,000',
        '8,000',
        '9,000',
      ];
      expect(labels).to.eql(expectedLabels);
    });
  });
}
