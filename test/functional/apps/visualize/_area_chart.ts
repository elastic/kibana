/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const log = getService('log');
  const find = getService('find');
  const inspector = getService('inspector');
  const browser = getService('browser');
  const retry = getService('retry');
  const security = getService('security');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects([
    'common',
    'visualize',
    'visEditor',
    'visChart',
    'header',
    'timePicker',
  ]);

  const getVizName = async () =>
    await PageObjects.visChart.getExpectedValue(
      'Visualization AreaChart Name Test',
      'Visualization AreaChart Name Test - Charts library'
    );

  describe('area charts', function indexPatternCreation() {
    const initAreaChart = async () => {
      log.debug('navigateToApp visualize');
      await PageObjects.visualize.navigateToNewAggBasedVisualization();
      log.debug('clickAreaChart');
      await PageObjects.visualize.clickAreaChart();
      log.debug('clickNewSearch');
      await PageObjects.visualize.clickNewSearch();
      await PageObjects.timePicker.setDefaultAbsoluteRange();
      log.debug('Click X-axis');
      await PageObjects.visEditor.clickBucket('X-axis');
      log.debug('Click Date Histogram');
      await PageObjects.visEditor.selectAggregation('Date Histogram');
      log.debug('Check field value');
      const fieldValues = await PageObjects.visEditor.getField();
      log.debug('fieldValue = ' + fieldValues);
      expect(fieldValues[0]).to.be('@timestamp');
      const intervalValue = await PageObjects.visEditor.getInterval();
      log.debug('intervalValue = ' + intervalValue);
      expect(intervalValue[0]).to.be('Auto');
      await PageObjects.visEditor.clickGo();
    };

    before(async function () {
      await security.testUser.setRoles([
        'kibana_admin',
        'long_window_logstash',
        'test_logstash_reader',
      ]);
      await initAreaChart();
    });

    after(async function () {
      await security.testUser.restoreDefaults();
    });

    it('should save and load with special characters', async function () {
      const vizNamewithSpecialChars = (await getVizName()) + '/?&=%';
      await PageObjects.visualize.saveVisualizationExpectSuccessAndBreadcrumb(
        vizNamewithSpecialChars
      );
    });

    it('should save and load with non-ascii characters', async function () {
      const vizNamewithSpecialChars = `${await getVizName()} with Umlaut ä`;
      await PageObjects.visualize.saveVisualizationExpectSuccessAndBreadcrumb(
        vizNamewithSpecialChars
      );
    });

    it('should save and load', async function () {
      await PageObjects.visualize.saveVisualizationExpectSuccessAndBreadcrumb(await getVizName());
      await PageObjects.visualize.loadSavedVisualization(await getVizName());
      await PageObjects.visChart.waitForVisualization();
    });

    it('should have inspector enabled', async function () {
      await inspector.expectIsEnabled();
    });

    it('should show correct chart', async function () {
      const xAxisLabels = await PageObjects.visChart.getExpectedValue(
        ['2015-09-20 00:00', '2015-09-21 00:00', '2015-09-22 00:00', '2015-09-23 00:00'],
        [
          '2015-09-20 00:00',
          '2015-09-20 12:00',
          '2015-09-21 00:00',
          '2015-09-21 12:00',
          '2015-09-22 00:00',
          '2015-09-22 12:00',
        ]
      );
      const yAxisLabels = await PageObjects.visChart.getExpectedValue(
        ['0', '200', '400', '600', '800', '1,000', '1,200', '1,400', '1,600'],
        ['0', '200', '400', '600', '800', '1,000', '1,200', '1,400']
      );
      const expectedAreaChartData = [
        37,
        202,
        740,
        1437,
        1371,
        751,
        188,
        31,
        42,
        202,
        683,
        1361,
        1415,
        707,
        177,
        27,
        32,
        175,
        707,
        1408,
        1355,
        726,
        201,
        29,
      ];

      await retry.try(async function tryingForTime() {
        const labels = await PageObjects.visChart.getXAxisLabels();
        log.debug('X-Axis labels = ' + labels);
        expect(labels).to.eql(xAxisLabels);
      });
      const labels = await PageObjects.visChart.getYAxisLabels();
      log.debug('Y-Axis labels = ' + labels);
      expect(labels).to.eql(yAxisLabels);
      const paths = await PageObjects.visChart.getAreaChartData('Count');
      log.debug('expectedAreaChartData = ' + expectedAreaChartData);
      log.debug('actual chart data =     ' + paths);
      expect(paths).to.eql(expectedAreaChartData);
    });

    it('should show correct data', async function () {
      const expectedTableData = [
        ['2015-09-20 00:00', '37'],
        ['2015-09-20 03:00', '202'],
        ['2015-09-20 06:00', '740'],
        ['2015-09-20 09:00', '1,437'],
        ['2015-09-20 12:00', '1,371'],
        ['2015-09-20 15:00', '751'],
        ['2015-09-20 18:00', '188'],
        ['2015-09-20 21:00', '31'],
        ['2015-09-21 00:00', '42'],
        ['2015-09-21 03:00', '202'],
        ['2015-09-21 06:00', '683'],
        ['2015-09-21 09:00', '1,361'],
        ['2015-09-21 12:00', '1,415'],
        ['2015-09-21 15:00', '707'],
        ['2015-09-21 18:00', '177'],
        ['2015-09-21 21:00', '27'],
        ['2015-09-22 00:00', '32'],
        ['2015-09-22 03:00', '175'],
        ['2015-09-22 06:00', '707'],
        ['2015-09-22 09:00', '1,408'],
        ['2015-09-22 12:00', '1,355'],
        ['2015-09-22 15:00', '726'],
        ['2015-09-22 18:00', '201'],
        ['2015-09-22 21:00', '29'],
      ];

      await inspector.open();
      await inspector.setTablePageSize(50);
      await inspector.expectTableData(expectedTableData);
      await inspector.close();
    });

    describe('axis scaling', () => {
      it('does not scale by default', async () => {
        const expectedTableData = [
          ['2015-09-20 00:00', '6'],
          ['2015-09-20 01:00', '9'],
          ['2015-09-20 02:00', '22'],
          ['2015-09-20 03:00', '31'],
          ['2015-09-20 04:00', '52'],
          ['2015-09-20 05:00', '119'],
          ['2015-09-20 06:00', '181'],
          ['2015-09-20 07:00', '218'],
          ['2015-09-20 08:00', '341'],
          ['2015-09-20 09:00', '440'],
          ['2015-09-20 10:00', '480'],
          ['2015-09-20 11:00', '517'],
          ['2015-09-20 12:00', '522'],
          ['2015-09-20 13:00', '446'],
          ['2015-09-20 14:00', '403'],
          ['2015-09-20 15:00', '321'],
          ['2015-09-20 16:00', '258'],
          ['2015-09-20 17:00', '172'],
          ['2015-09-20 18:00', '95'],
          ['2015-09-20 19:00', '55'],
        ];

        await PageObjects.visEditor.toggleOpenEditor(2);
        await PageObjects.visEditor.setInterval('Second');
        await PageObjects.visEditor.clickGo();
        await inspector.open();
        await inspector.expectTableData(expectedTableData);
        await inspector.close();
      });

      it('scales when enabled count agg', async () => {
        const expectedTableData = [
          ['2015-09-20 00:00', '0.002'],
          ['2015-09-20 01:00', '0.003'],
          ['2015-09-20 02:00', '0.006'],
          ['2015-09-20 03:00', '0.009'],
          ['2015-09-20 04:00', '0.014'],
          ['2015-09-20 05:00', '0.033'],
          ['2015-09-20 06:00', '0.05'],
          ['2015-09-20 07:00', '0.061'],
          ['2015-09-20 08:00', '0.095'],
          ['2015-09-20 09:00', '0.122'],
          ['2015-09-20 10:00', '0.133'],
          ['2015-09-20 11:00', '0.144'],
          ['2015-09-20 12:00', '0.145'],
          ['2015-09-20 13:00', '0.124'],
          ['2015-09-20 14:00', '0.112'],
          ['2015-09-20 15:00', '0.089'],
          ['2015-09-20 16:00', '0.072'],
          ['2015-09-20 17:00', '0.048'],
          ['2015-09-20 18:00', '0.026'],
          ['2015-09-20 19:00', '0.015'],
        ];

        await PageObjects.visEditor.toggleAdvancedParams('2');
        await PageObjects.visEditor.toggleScaleMetrics();
        await PageObjects.visEditor.clickGo();
        await inspector.open();
        await inspector.expectTableData(expectedTableData);
        await inspector.close();
      });

      it('does not scale top hit agg', async () => {
        const expectedTableData = [
          ['2015-09-20 00:00', '6', '9.035KB'],
          ['2015-09-20 01:00', '9', '5.854KB'],
          ['2015-09-20 02:00', '22', '4.588KB'],
          ['2015-09-20 03:00', '31', '8.349KB'],
          ['2015-09-20 04:00', '52', '2.637KB'],
          ['2015-09-20 05:00', '119', '1.712KB'],
          ['2015-09-20 06:00', '181', '9.157KB'],
          ['2015-09-20 07:00', '218', '8.192KB'],
          ['2015-09-20 08:00', '341', '12.384KB'],
          ['2015-09-20 09:00', '440', '4.482KB'],
          ['2015-09-20 10:00', '480', '9.449KB'],
          ['2015-09-20 11:00', '517', '213B'],
          ['2015-09-20 12:00', '522', '638B'],
          ['2015-09-20 13:00', '446', '7.421KB'],
          ['2015-09-20 14:00', '403', '4.854KB'],
          ['2015-09-20 15:00', '321', '4.132KB'],
          ['2015-09-20 16:00', '258', '601B'],
          ['2015-09-20 17:00', '172', '4.239KB'],
          ['2015-09-20 18:00', '95', '6.272KB'],
          ['2015-09-20 19:00', '55', '2.053KB'],
        ];

        await PageObjects.visEditor.clickBucket('Y-axis', 'metrics');
        await PageObjects.visEditor.selectAggregation('Top Hit', 'metrics');
        await PageObjects.visEditor.selectField('bytes', 'metrics');
        await PageObjects.visEditor.selectAggregateWith('average');
        await PageObjects.visEditor.clickGo();
        await inspector.open();
        await inspector.expectTableData(expectedTableData);
        await inspector.close();
      });
    });

    describe('embedded mode', () => {
      it('should hide side editor if embed is set to true in url', async () => {
        const url = await browser.getCurrentUrl();
        const embedUrl = url.split('/visualize#').pop() + '&embed=true';
        await PageObjects.common.navigateToUrl('visualize', embedUrl, { useActualUrl: true });
        await PageObjects.header.waitUntilLoadingHasFinished();
        const sideEditorExists = await PageObjects.visualize.getSideEditorExists();
        expect(sideEditorExists).to.be(false);
      });

      after(async () => {
        const url = (await browser.getCurrentUrl()) ?? '';
        const lastValue = url.split('/visualize#').pop() ?? '';
        const embedUrl = lastValue.replace('embed=true', '');
        await PageObjects.common.navigateToUrl('visualize', embedUrl, { useActualUrl: true });
      });
    });

    describe('switch between Y axis scale types', () => {
      before(initAreaChart);
      const axisId = 'ValueAxis-1';

      it('should show ticks on selecting log scale', async () => {
        await PageObjects.visEditor.clickMetricsAndAxes();
        await PageObjects.visEditor.clickYAxisOptions(axisId);
        await PageObjects.visEditor.selectYAxisScaleType(axisId, 'log');
        await PageObjects.visEditor.changeYAxisFilterLabelsCheckbox(axisId, false);
        await PageObjects.visEditor.clickGo();
        const labels = await PageObjects.visChart.getYAxisLabelsAsNumbers();
        const minLabel = await PageObjects.visChart.getExpectedValue(2, 1);
        const maxLabel = await PageObjects.visChart.getExpectedValue(5000, 900);
        const numberOfLabels = 10;
        expect(labels.length).to.be.greaterThan(numberOfLabels);
        expect(labels[0]).to.eql(minLabel);
        expect(labels[labels.length - 1]).to.be.greaterThan(maxLabel);
      });

      it('should show filtered ticks on selecting log scale', async () => {
        await PageObjects.visEditor.changeYAxisFilterLabelsCheckbox(axisId, true);
        await PageObjects.visEditor.clickGo();
        const labels = await PageObjects.visChart.getYAxisLabelsAsNumbers();
        const minLabel = await PageObjects.visChart.getExpectedValue(2, 1);
        const maxLabel = await PageObjects.visChart.getExpectedValue(5000, 900);
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
        const expectedLabels = await PageObjects.visChart.getExpectedValue(
          ['0', '200', '400', '600', '800', '1,000', '1,200', '1,400', '1,600'],
          ['0', '200', '400', '600', '800', '1,000', '1,200', '1,400']
        );
        expect(labels).to.eql(expectedLabels);
      });

      it('should show filtered ticks on selecting square root scale', async () => {
        await PageObjects.visEditor.changeYAxisFilterLabelsCheckbox(axisId, true);
        await PageObjects.visEditor.clickGo();
        const labels = await PageObjects.visChart.getYAxisLabels();
        const expectedLabels = await PageObjects.visChart.getExpectedValue(
          ['200', '400', '600', '800', '1,000', '1,200', '1,400'],
          ['0', '200', '400', '600', '800', '1,000', '1,200', '1,400']
        );
        expect(labels).to.eql(expectedLabels);
      });

      it('should show ticks on selecting linear scale', async () => {
        await PageObjects.visEditor.selectYAxisScaleType(axisId, 'linear');
        await PageObjects.visEditor.changeYAxisFilterLabelsCheckbox(axisId, false);
        await PageObjects.visEditor.clickGo();
        const labels = await PageObjects.visChart.getYAxisLabels();
        log.debug(labels);
        const expectedLabels = await PageObjects.visChart.getExpectedValue(
          ['0', '200', '400', '600', '800', '1,000', '1,200', '1,400', '1,600'],
          ['0', '200', '400', '600', '800', '1,000', '1,200', '1,400']
        );
        expect(labels).to.eql(expectedLabels);
      });

      it('should show filtered ticks on selecting linear scale', async () => {
        await PageObjects.visEditor.changeYAxisFilterLabelsCheckbox(axisId, true);
        await PageObjects.visEditor.clickGo();
        const labels = await PageObjects.visChart.getYAxisLabels();
        const expectedLabels = await PageObjects.visChart.getExpectedValue(
          ['200', '400', '600', '800', '1,000', '1,200', '1,400'],
          ['0', '200', '400', '600', '800', '1,000', '1,200', '1,400']
        );
        expect(labels).to.eql(expectedLabels);
      });
    });
    describe('date histogram with long time range', () => {
      // that dataset spans from Oct 26, 2013 @ 06:10:17.855	to Apr 18, 2019 @ 11:38:12.790
      const fromTime = 'Jan 1, 2013 @ 00:00:00.000';
      const toTime = 'Jan 1, 2020 @ 00:00:00.000';

      it('should render a yearly area with 12 svg paths', async () => {
        log.debug('navigateToApp visualize');
        await PageObjects.visualize.navigateToNewAggBasedVisualization();
        log.debug('clickAreaChart');
        await PageObjects.visualize.clickAreaChart();
        log.debug('clickNewSearch');
        await PageObjects.visualize.clickNewSearch('long-window-logstash-*');
        await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
        log.debug('Click X-axis');
        await PageObjects.visEditor.clickBucket('X-axis');
        log.debug('Click Date Histogram');
        await PageObjects.visEditor.selectAggregation('Date Histogram');
        await PageObjects.visEditor.selectField('@timestamp');
        await PageObjects.visEditor.setInterval('Year');
        await PageObjects.visEditor.clickGo();
        // This svg area is composed by 7 years (2013 - 2019).
        // 7 points are used to draw the upper line (usually called y1)
        // 7 points compose the lower line (usually called y0)
        const paths = await PageObjects.visChart.getAreaChartPaths('Count');
        log.debug('actual chart data =     ' + paths);
        const numberOfSegments = 7 * 2;
        expect(paths.length).to.eql(numberOfSegments);
      });
      it('should render monthly areas with 168 svg paths', async () => {
        log.debug('navigateToApp visualize');
        await PageObjects.visualize.navigateToNewAggBasedVisualization();
        log.debug('clickAreaChart');
        await PageObjects.visualize.clickAreaChart();
        log.debug('clickNewSearch');
        await PageObjects.visualize.clickNewSearch('long-window-logstash-*');
        await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
        log.debug('Click X-axis');
        await PageObjects.visEditor.clickBucket('X-axis');
        log.debug('Click Date Histogram');
        await PageObjects.visEditor.selectAggregation('Date Histogram');
        await PageObjects.visEditor.selectField('@timestamp');
        await PageObjects.visEditor.setInterval('Month');
        await PageObjects.visEditor.clickGo();
        // This svg area is composed by 67 months 3 (2013) + 5 * 12 + 4 (2019)
        // 67 points are used to draw the upper line (usually called y1)
        // 67 points compose the lower line (usually called y0)
        const numberOfSegments = 67 * 2;
        const paths = await PageObjects.visChart.getAreaChartPaths('Count');
        log.debug('actual chart data =     ' + paths);
        expect(paths.length).to.eql(numberOfSegments);
      });
    });

    describe('date histogram when no date field', () => {
      before(async () => {
        await PageObjects.visualize.loadSavedVisualization('AreaChart [no date field]');
        await PageObjects.visChart.waitForVisualization();

        log.debug('Click X-axis');
        await PageObjects.visEditor.clickBucket('X-axis');
        log.debug('Click Date Histogram');
        await PageObjects.visEditor.selectAggregation('Date Histogram');
      });

      it('should show error message for field', async () => {
        const fieldErrorMessage = await find.byCssSelector(
          '[data-test-subj="visDefaultEditorField"] + .euiFormErrorText'
        );
        const errorMessage = await fieldErrorMessage.getVisibleText();
        expect(errorMessage).to.be(
          'The index pattern test_index* does not contain any of the following compatible field types: date'
        );
      });
    });

    describe('date histogram when no time filter', () => {
      before(async () => {
        await PageObjects.visualize.loadSavedVisualization('AreaChart [no time filter]');
        await PageObjects.visChart.waitForVisualization();

        log.debug('Click X-axis');
        await PageObjects.visEditor.clickBucket('X-axis');
        log.debug('Click Date Histogram');
        await PageObjects.visEditor.selectAggregation('Date Histogram');
      });

      it('should not show error message on init when the field is not selected', async () => {
        const fieldValues = await PageObjects.visEditor.getField();
        expect(fieldValues[0]).to.be(undefined);
        const isFieldErrorMessageExists = await find.existsByCssSelector(
          '[data-test-subj="visDefaultEditorField"] + .euiFormErrorText'
        );
        expect(isFieldErrorMessageExists).to.be(false);
      });

      describe('interval errors', () => {
        before(async () => {
          // to trigger displaying of error messages
          await testSubjects.clickWhenNotDisabled('visualizeEditorRenderButton');
          // this will avoid issues with the play tooltip covering the interval field
          await testSubjects.scrollIntoView('advancedParams-2');
        });

        it('should not fail during changing interval when the field is not selected', async () => {
          await PageObjects.visEditor.setInterval('m');
          const intervalValues = await PageObjects.visEditor.getInterval();
          expect(intervalValues[0]).to.be('Millisecond');
        });

        it('should not fail during changing custom interval when the field is not selected', async () => {
          await PageObjects.visEditor.setInterval('4d', { type: 'custom' });
          const isInvalidIntervalExists = await find.existsByCssSelector(
            '.euiComboBox-isInvalid[data-test-subj="visEditorInterval"]'
          );
          expect(isInvalidIntervalExists).to.be(false);
        });

        it('should show error when interval invalid', async () => {
          await PageObjects.visEditor.setInterval('xx', { type: 'custom' });
          const isIntervalErrorMessageExists = await find.existsByCssSelector(
            '[data-test-subj="visEditorInterval"] + .euiFormErrorText'
          );
          expect(isIntervalErrorMessageExists).to.be(true);
        });

        it('should show error when calendar interval invalid', async () => {
          await PageObjects.visEditor.setInterval('14d', { type: 'custom' });
          const intervalErrorMessage = await find.byCssSelector(
            '[data-test-subj="visEditorInterval"] + .euiFormErrorText'
          );
          let errorMessage = await intervalErrorMessage.getVisibleText();
          expect(errorMessage).to.be('Invalid calendar interval: 2w, value must be 1');

          await PageObjects.visEditor.setInterval('3w', { type: 'custom' });
          errorMessage = await intervalErrorMessage.getVisibleText();
          expect(errorMessage).to.be('Invalid calendar interval: 3w, value must be 1');
        });
      });
    });

    describe('date histogram interval', () => {
      before(async () => {
        await PageObjects.visualize.loadSavedVisualization('Visualization AreaChart');
        await PageObjects.visChart.waitForVisualization();
      });

      beforeEach(async () => {
        const fromTime = 'Sep 20, 2015 @ 00:00:00.000';
        const toTime = 'Sep 20, 2015 @ 23:30:00.000';
        await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
      });

      it('should update collapsed accordion label when time range is changed', async () => {
        const accordionLabel = await find.byCssSelector(
          '[data-test-subj="visEditorAggAccordion2"] .visEditorSidebar__aggGroupAccordionButtonContent'
        );
        let accordionLabelText = await accordionLabel.getVisibleText();
        expect(accordionLabelText).to.include.string('per 30 minutes');
        const fromTime = 'Sep 20, 2015 @ 08:30:00.000';
        const toTime = 'Sep 20, 2015 @ 23:30:00.000';
        await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
        accordionLabelText = await accordionLabel.getVisibleText();
        expect(accordionLabelText).to.include.string('per 10 minutes');
      });

      describe('expanded accordion', () => {
        before(async () => await PageObjects.visEditor.toggleAccordion('visEditorAggAccordion2'));

        it('should update label inside the opened accordion when scaled to milliseconds', async () => {
          const isHelperScaledLabelExists = await find.existsByCssSelector(
            '[data-test-subj="currentlyScaledText"]'
          );
          expect(isHelperScaledLabelExists).to.be(false);
          await PageObjects.visEditor.setInterval('Millisecond');
          const helperScaledLabelText = await testSubjects.getVisibleText('currentlyScaledText');
          expect(helperScaledLabelText).to.include.string('to 10 minutes');
        });

        it('should display updated scaled label text after time range is changed', async () => {
          await PageObjects.visEditor.setInterval('Millisecond');

          // Apply interval
          await testSubjects.clickWhenNotDisabled('visualizeEditorRenderButton');

          const isHelperScaledLabelExists = await find.existsByCssSelector(
            '[data-test-subj="currentlyScaledText"]'
          );
          expect(isHelperScaledLabelExists).to.be(true);
          let helperScaledLabelText = await testSubjects.getVisibleText('currentlyScaledText');
          expect(helperScaledLabelText).to.include.string('to 10 minutes');
          const fromTime = 'Sep 20, 2015 @ 22:30:00.000';
          const toTime = 'Sep 20, 2015 @ 23:30:00.000';
          await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
          helperScaledLabelText = await testSubjects.getVisibleText('currentlyScaledText');
          expect(helperScaledLabelText).to.include.string('to 30 seconds');
        });

        it('should update scaled label text after custom interval is set and time range is changed', async () => {
          await PageObjects.visEditor.setInterval('10s', { type: 'custom' });
          await testSubjects.clickWhenNotDisabled('visualizeEditorRenderButton');
          const isHelperScaledLabelExists = await find.existsByCssSelector(
            '[data-test-subj="currentlyScaledText"]'
          );
          expect(isHelperScaledLabelExists).to.be(true);
          let helperScaledLabelText = await testSubjects.getVisibleText('currentlyScaledText');
          expect(helperScaledLabelText).to.include.string('to 10 minutes');
          const fromTime = 'Sep 20, 2015 @ 21:30:00.000';
          const toTime = 'Sep 20, 2015 @ 23:30:00.000';
          await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
          helperScaledLabelText = await testSubjects.getVisibleText('currentlyScaledText');
          expect(helperScaledLabelText).to.include.string('to minute');
        });
      });
    });
  });
}
