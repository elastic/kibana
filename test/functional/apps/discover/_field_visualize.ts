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
  const esArchiver = getService('esArchiver');
  const filterBar = getService('filterBar');
  const inspector = getService('inspector');
  const kibanaServer = getService('kibanaServer');
  const log = getService('log');
  const queryBar = getService('queryBar');
  const PageObjects = getPageObjects(['common', 'discover', 'header', 'timePicker', 'visualize']);
  const defaultSettings = {
    defaultIndex: 'logstash-*',
  };

  describe('discover field visualize button', function () {
    // unskipped on cloud as these tests test the navigation
    // from Discover to Visualize which happens only on OSS
    this.tags(['skipCloud']);
    before(async function () {
      log.debug('load kibana index with default index pattern');
      await esArchiver.load('discover');

      // and load a set of makelogs data
      await esArchiver.loadIfNeeded('logstash_functional');
      await kibanaServer.uiSettings.replace(defaultSettings);
    });

    beforeEach(async () => {
      log.debug('go to discover');
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.timePicker.setDefaultAbsoluteRange();
    });

    it('should be able to visualize a field and save the visualization', async () => {
      await PageObjects.discover.findFieldByName('type');
      log.debug('visualize a type field');
      await PageObjects.discover.clickFieldListItemVisualize('type');
      await PageObjects.visualize.saveVisualizationExpectSuccess('Top 5 server types');
    });

    it('should visualize a field in area chart', async () => {
      await PageObjects.discover.findFieldByName('phpmemory');
      log.debug('visualize a phpmemory field');
      await PageObjects.discover.clickFieldListItemVisualize('phpmemory');
      await PageObjects.header.waitUntilLoadingHasFinished();
      const expectedTableData = [
        ['0', '10'],
        ['58,320', '2'],
        ['171,080', '2'],
        ['3,240', '1'],
        ['3,520', '1'],
        ['3,880', '1'],
        ['4,120', '1'],
        ['4,640', '1'],
        ['4,760', '1'],
        ['5,680', '1'],
        ['7,160', '1'],
        ['7,400', '1'],
        ['8,400', '1'],
        ['8,800', '1'],
        ['8,960', '1'],
        ['9,400', '1'],
        ['10,280', '1'],
        ['10,840', '1'],
        ['13,080', '1'],
        ['13,360', '1'],
      ];
      await inspector.open();
      await inspector.expectTableData(expectedTableData);
      await inspector.close();
    });

    it('should not show the "Visualize" button for geo field', async () => {
      await PageObjects.discover.findFieldByName('geo.coordinates');
      log.debug('visualize a geo field');
      await PageObjects.discover.expectMissingFieldListItemVisualize('geo.coordinates');
    });

    it('should preserve app filters in visualize', async () => {
      await filterBar.addFilter('bytes', 'is between', '3500', '4000');
      await PageObjects.discover.findFieldByName('geo.src');
      log.debug('visualize a geo.src field with filter applied');
      await PageObjects.discover.clickFieldListItemVisualize('geo.src');
      await PageObjects.header.waitUntilLoadingHasFinished();

      expect(await filterBar.hasFilter('bytes', '3,500 to 4,000')).to.be(true);
      const expectedTableData = [
        ['CN', '133'],
        ['IN', '120'],
        ['US', '58'],
        ['ID', '28'],
        ['BD', '25'],
        ['BR', '22'],
        ['EG', '14'],
        ['NG', '14'],
        ['PK', '13'],
        ['IR', '12'],
        ['PH', '12'],
        ['JP', '11'],
        ['RU', '11'],
        ['DE', '8'],
        ['FR', '8'],
        ['MX', '8'],
        ['TH', '8'],
        ['TR', '8'],
        ['CA', '6'],
        ['SA', '6'],
      ];
      await inspector.open();
      await inspector.expectTableData(expectedTableData);
      await inspector.close();
    });

    it('should preserve query in visualize', async () => {
      await queryBar.setQuery('machine.os : ios');
      await queryBar.submitQuery();
      await PageObjects.discover.findFieldByName('geo.dest');
      log.debug('visualize a geo.dest field with query applied');
      await PageObjects.discover.clickFieldListItemVisualize('geo.dest');
      await PageObjects.header.waitUntilLoadingHasFinished();

      expect(await queryBar.getQueryString()).to.equal('machine.os : ios');
      const expectedTableData = [
        ['CN', '519'],
        ['IN', '495'],
        ['US', '275'],
        ['ID', '82'],
        ['PK', '75'],
        ['BR', '71'],
        ['NG', '54'],
        ['BD', '51'],
        ['JP', '47'],
        ['MX', '47'],
        ['IR', '44'],
        ['PH', '44'],
        ['RU', '42'],
        ['ET', '33'],
        ['TH', '33'],
        ['EG', '32'],
        ['VN', '32'],
        ['DE', '31'],
        ['FR', '30'],
        ['GB', '30'],
      ];
      await inspector.open();
      await inspector.expectTableData(expectedTableData);
      await inspector.close();
    });
  });
}
