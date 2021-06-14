/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { visualBuilder, visualize, visChart, settings } = getPageObjects([
    'visualBuilder',
    'visualize',
    'visChart',
    'settings',
  ]);
  const testSubjects = getService('testSubjects');

  describe('visual builder', function describeIndexTests() {
    before(async () => {
      await visualize.initTests();
    });
    describe('table', () => {
      beforeEach(async () => {
        await visualBuilder.resetPage('Sep 22, 2015 @ 06:00:00.000', 'Sep 22, 2015 @ 11:00:00.000');
        await visualBuilder.clickTable();

        await visualBuilder.checkTableTabIsPresent();
        await visualBuilder.clickPanelOptions('table');
        await visualBuilder.setMetricsDataTimerangeMode('Last value');
        await visualBuilder.setDropLastBucket(true);
        await visualBuilder.clickDataTab('table');
        await visualBuilder.selectGroupByField('machine.os.raw');
        await visualBuilder.setColumnLabelValue('OS');
        await visChart.waitForVisualizationRenderingStabilized();
      });

      it('should display correct values on changing group by field and column name', async () => {
        const EXPECTED = 'OS Count\nwin 8 13\nwin xp 10\nwin 7 12\nios 5\nosx 3';

        const tableData = await visualBuilder.getViewTable();
        expect(tableData).to.be(EXPECTED);
      });

      it('should display correct values on changing metrics aggregation', async () => {
        const EXPECTED = 'OS Cardinality\nwin 8 12\nwin xp 9\nwin 7 8\nios 5\nosx 3';

        await visualBuilder.setLabel('Cardinality');
        await visualBuilder.selectAggType('Cardinality');
        await visualBuilder.setFieldForAggregation('machine.ram');
        const isFieldForAggregationValid = await visualBuilder.checkFieldForAggregationValidity();
        const tableData = await visualBuilder.getViewTable();
        expect(isFieldForAggregationValid).to.be(true);
        expect(tableData).to.be(EXPECTED);
      });

      it('should render correctly after saving', async () => {
        const EXPECTED = 'OS Count\nwin 8 13\nwin xp 10\nwin 7 12\nios 5\nosx 3';

        await visualize.saveVisualizationExpectSuccessAndBreadcrumb('TSVB table saving test');

        const tableData = await visualBuilder.getViewTable();
        expect(tableData).to.be(EXPECTED);
      });

      describe('applying field formats from Advanced Settings', () => {
        const toggleSetFormatForMachineOsRawInIndexPatterns = async () => {
          await settings.navigateTo();
          await settings.clickKibanaIndexPatterns();
          await settings.clickIndexPatternLogstash();
          await settings.filterField('machine.os.raw');
          await settings.openControlsByName('machine.os.raw');
          const formatRow = await testSubjects.find('formatRow');
          const [formatRowToggle] = await formatRow.findAllByCssSelector(
            '[data-test-subj="toggle"]'
          );
          await formatRowToggle.click();
        };

        before(async () => {
          await toggleSetFormatForMachineOsRawInIndexPatterns();
          await settings.setFieldFormat('string');
          await settings.setScriptedFieldStringTransform('upper');
          await settings.controlChangeSave();
        });

        beforeEach(async () => {
          await visualBuilder.selectAggType('Average');
          await visualBuilder.setFieldForAggregation('bytes');
        });

        it('should display field formatted row labels with raw data', async () => {
          const expected =
            'OS Average of bytes\nWIN 8 6,948.846\nWIN XP 3,895.6\nWIN 7 6,753.833\nIOS 4,960.2\nOSX 3,133';

          const tableData = await visualBuilder.getViewTable();
          expect(tableData).to.be(expected);
        });

        it('should display field formatted row labels with TSVB formatted data by default', async () => {
          const expected =
            'OS Average of bytes\nWIN 8 694,884.615%\nWIN XP 389,560%\nWIN 7 675,383.333%\nIOS 496,020%\nOSX 313,300%';

          await visualBuilder.clickSeriesOption();
          await visualBuilder.changeDataFormatter('Percent');

          const tableData = await visualBuilder.getViewTable();
          expect(tableData).to.be(expected);
        });

        it('should display field formatted row labels with field formatted data when ignore field formatting is disabled', async () => {
          const expected =
            'OS Average of bytes\nWIN 8 6.786KB\nWIN XP 3.804KB\nWIN 7 6.596KB\nIOS 4.844KB\nOSX 3.06KB';

          await visualBuilder.clickSeriesOption();
          await visualBuilder.setSeriesIgnoreFieldFormatting(false);

          const tableData = await visualBuilder.getViewTable();
          expect(tableData).to.be(expected);
        });

        after(async () => await toggleSetFormatForMachineOsRawInIndexPatterns());
      });
    });
  });
}
