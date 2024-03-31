/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const PageObjects = getPageObjects(['common', 'discover', 'timePicker', 'unifiedFieldList']);
  const kibanaServer = getService('kibanaServer');
  const security = getService('security');
  const dataGrid = getService('dataGrid');

  describe('Discover document comparison', () => {
    before(async () => {
      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader']);
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover.json');
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.uiSettings.replace({ defaultIndex: 'logstash-*' });
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.timePicker.setDefaultAbsoluteRange();
    });

    after(async () => {
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover.json');
      await esArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.uiSettings.replace({});
      await kibanaServer.savedObjects.cleanStandardList();
    });

    it('should allow comparing documents', async () => {
      await PageObjects.discover.waitUntilSearchingHasFinished();
      await dataGrid.selectRow(0);
      await dataGrid.openSelectedRowsMenu();
      expect(await dataGrid.compareSelectedButtonExists()).to.be(false);
      await dataGrid.selectRow(1);
      await dataGrid.openSelectedRowsMenu();
      expect(await dataGrid.compareSelectedButtonExists()).to.be(true);
      await dataGrid.clickCompareSelectedButton();
      await dataGrid.waitForComparisonModeToLoad();
      expect(await dataGrid.getComparisonDisplay()).to.be('Comparing 2 documents');
    });

    it('should allow selecting comparison fields', async () => {
      const headers = await dataGrid.getHeaders();
      expect(headers).to.eql(['Field', 'AU_x3_g4GFA8no6QjkYX', 'AU_x3-TcGFA8no6Qjipx']);
      let fieldNames = await dataGrid.getComparisonFieldNames();
      expect(fieldNames).have.length(18);
      expect(fieldNames).to.eql([
        '@timestamp',
        '_id',
        '_index',
        '@message',
        '@message.raw',
        '@tags',
        '@tags.raw',
        'agent',
        'agent.raw',
        'bytes',
        'clientip',
        'extension',
        'extension.raw',
        'geo.coordinates',
        'geo.dest',
        'geo.src',
        'geo.srcdest',
        'headings',
      ]);
      await dataGrid.openComparisonSettingsMenu();
      expect(await dataGrid.showAllFieldsSwitchExists()).to.be(false);
      await PageObjects.unifiedFieldList.clickFieldListItemAdd('extension');
      await PageObjects.unifiedFieldList.clickFieldListItemAdd('bytes');
      await PageObjects.unifiedFieldList.clickFieldListItemAdd('@message');
      await PageObjects.unifiedFieldList.clickFieldListItemAdd('agent');
      fieldNames = await dataGrid.getComparisonFieldNames();
      expect(fieldNames).have.length(5);
      expect(fieldNames).to.eql(['@timestamp', 'extension', 'bytes', '@message', 'agent']);
    });

    const testDiffMode = async ({
      diffMode,
      expectedExtensionValues,
      expectedBytesValues,
    }: {
      diffMode: Parameters<typeof dataGrid.selectComparisonDiffMode>[0];
      expectedExtensionValues: string[];
      expectedBytesValues: string[];
    }) => {
      await dataGrid.selectComparisonDiffMode(diffMode);
      const extensionRow = await dataGrid.getComparisonRow(1);
      expect(extensionRow.fieldName).to.be('extension');
      expect(extensionRow.values).to.eql(expectedExtensionValues);
      const bytesRow = await dataGrid.getComparisonRow(2);
      expect(bytesRow.fieldName).to.be('bytes');
      expect(bytesRow.values).to.eql(expectedBytesValues);
    };

    it('should allow changing diff modes', async () => {
      await testDiffMode({
        diffMode: 'basic',
        expectedExtensionValues: ['jpg', 'jpg'],
        expectedBytesValues: ['7,124', '5,453'],
      });
      await testDiffMode({
        diffMode: 'chars',
        expectedExtensionValues: [
          'jpg',
          '<span class="unifiedDataTable__comparisonSegment">jpg</span>',
        ],
        expectedBytesValues: [
          '7124',
          '<span class="unifiedDataTable__comparisonSegment unifiedDataTable__comparisonRemovedSegment">712</span>' +
            '<span class="unifiedDataTable__comparisonSegment unifiedDataTable__comparisonAddedSegment">5</span>' +
            '<span class="unifiedDataTable__comparisonSegment">4</span>' +
            '<span class="unifiedDataTable__comparisonSegment unifiedDataTable__comparisonAddedSegment">53</span>',
        ],
      });
      await testDiffMode({
        diffMode: 'words',
        expectedExtensionValues: [
          'jpg',
          '<span class="unifiedDataTable__comparisonSegment">jpg</span>',
        ],
        expectedBytesValues: [
          '7124',
          '<span class="unifiedDataTable__comparisonSegment unifiedDataTable__comparisonRemovedSegment">7124</span>' +
            '<span class="unifiedDataTable__comparisonSegment unifiedDataTable__comparisonAddedSegment">5453</span>',
        ],
      });
      await testDiffMode({
        diffMode: 'lines',
        expectedExtensionValues: [
          'jpg',
          '<div class="unifiedDataTable__comparisonSegment">jpg</div>',
        ],
        expectedBytesValues: [
          '7124',
          '<div class="unifiedDataTable__comparisonSegment unifiedDataTable__comparisonRemovedSegment">7124</div>' +
            '<div class="unifiedDataTable__comparisonSegment unifiedDataTable__comparisonAddedSegment">5453</div>',
        ],
      });
      await testDiffMode({
        diffMode: null,
        expectedExtensionValues: ['jpg', 'jpg'],
        expectedBytesValues: ['7,124', '5,453'],
      });
    });

    it('should allow toggling all fields', async () => {
      await dataGrid.toggleShowAllFieldsSwitch();
      const fieldNames = await dataGrid.getComparisonFieldNames();
      expect(fieldNames).have.length(18);
      await dataGrid.toggleShowAllFieldsSwitch();
    });

    it('should allow toggling matching values', async () => {
      let fieldNames = await dataGrid.getComparisonFieldNames();
      expect(fieldNames).have.length(5);
      await dataGrid.toggleShowMatchingValuesSwitch();
      fieldNames = await dataGrid.getComparisonFieldNames();
      expect(fieldNames).have.length(4);
      expect(fieldNames).to.eql(['@timestamp', 'bytes', '@message', 'agent']);
      await dataGrid.toggleShowMatchingValuesSwitch();
    });

    it('should allow toggling diff decorations', async () => {
      await dataGrid.selectComparisonDiffMode('words');
      let diffSegments = await dataGrid.getComparisonDiffSegments(2, 2);
      expect(diffSegments).to.eql([
        { decoration: 'removed', value: '7124' },
        { decoration: 'added', value: '5453' },
      ]);
      await dataGrid.toggleShowDiffDecorationsSwitch();
      diffSegments = await dataGrid.getComparisonDiffSegments(2, 2);
      expect(diffSegments).to.eql([
        { decoration: undefined, value: '7124' },
        { decoration: undefined, value: '5453' },
      ]);
      await dataGrid.toggleShowDiffDecorationsSwitch();
    });

    it('should allow exiting comparison mode', async () => {
      await dataGrid.exitComparisonMode();
      await PageObjects.discover.waitForDocTableLoadingComplete();
    });
  });
}
