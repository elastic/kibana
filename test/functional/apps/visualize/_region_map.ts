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
  describe('vector map', function () {
    const inspector = getService('inspector');
    const log = getService('log');
    const find = getService('find');
    const PageObjects = getPageObjects(['visualize', 'visEditor', 'timePicker']);

    before(async function () {
      log.debug('navigateToApp visualize');
      await PageObjects.visualize.navigateToNewAggBasedVisualization();
      log.debug('clickRegionMap');
      await PageObjects.visualize.clickRegionMap();
      await PageObjects.visualize.clickNewSearch();
      await PageObjects.timePicker.setDefaultAbsoluteRange();
      log.debug('Bucket = Shape field');
      await PageObjects.visEditor.clickBucket('Shape field');
      log.debug('Aggregation = Terms');
      await PageObjects.visEditor.selectAggregation('Terms');
      log.debug('Field = geo.src');
      await PageObjects.visEditor.selectField('geo.src');
      await PageObjects.visEditor.clickGo();
    });

    describe('vector map', function indexPatternCreation() {
      it('should have inspector enabled', async function () {
        await inspector.expectIsEnabled();
      });

      it('should show results after clicking play (join on states)', async function () {
        const expectedData = [
          ['CN', '2,592'],
          ['IN', '2,373'],
          ['US', '1,194'],
          ['ID', '489'],
          ['BR', '415'],
        ];
        await inspector.open();
        await inspector.expectTableData(expectedData);
        await inspector.close();
      });

      it('should change results after changing layer to world', async function () {
        await PageObjects.visEditor.clickOptionsTab();
        await PageObjects.visEditor.setSelectByOptionText(
          'regionMapOptionsSelectLayer',
          'World Countries'
        );

        // ensure all fields are there
        await PageObjects.visEditor.setSelectByOptionText(
          'regionMapOptionsSelectJoinField',
          'ISO 3166-1 alpha-2 code'
        );
        await PageObjects.visEditor.setSelectByOptionText(
          'regionMapOptionsSelectJoinField',
          'ISO 3166-1 alpha-3 code'
        );
        await PageObjects.visEditor.setSelectByOptionText(
          'regionMapOptionsSelectJoinField',
          'name'
        );
        await PageObjects.visEditor.setSelectByOptionText(
          'regionMapOptionsSelectJoinField',
          'ISO 3166-1 alpha-2 code'
        );

        await inspector.open();
        const actualData = await inspector.getTableData();
        const expectedData = [
          ['CN', '2,592'],
          ['IN', '2,373'],
          ['US', '1,194'],
          ['ID', '489'],
          ['BR', '415'],
        ];
        expect(actualData).to.eql(expectedData);

        await inspector.close();
      });

      it('should contain a dropdown with the default road_map base layer as an option', async () => {
        const selectField = await find.byCssSelector('#wmsOptionsSelectTmsLayer');
        const $ = await selectField.parseDomContent();
        const optionsText = $('option')
          .toArray()
          .map((option) => $(option).text());

        expect(optionsText.includes('road_map')).to.be(true);
      });
    });
  });
}
