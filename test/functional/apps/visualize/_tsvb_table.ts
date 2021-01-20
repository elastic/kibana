/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects }: FtrProviderContext) {
  const { visualBuilder, visualize, visChart } = getPageObjects([
    'visualBuilder',
    'visualize',
    'visChart',
  ]);

  describe('visual builder', function describeIndexTests() {
    describe('table', () => {
      beforeEach(async () => {
        await visualBuilder.resetPage('Sep 22, 2015 @ 06:00:00.000', 'Sep 22, 2015 @ 11:00:00.000');
        await visualBuilder.clickTable();

        await visualBuilder.checkTableTabIsPresent();
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
    });
  });
}
