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
  const monacoEditor = getService('monacoEditor');
  const testSubjects = getService('testSubjects');

  describe('Discover document comparison', () => {
    before(async () => {
      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader']);
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover.json');
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.uiSettings.replace({ defaultIndex: 'logstash-*' });
    });

    after(async () => {
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover.json');
      await esArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.uiSettings.replace({});
      await kibanaServer.savedObjects.cleanStandardList();
    });

    describe('data view mode', () => {
      before(async () => {
        await PageObjects.common.navigateToApp('discover');
        await PageObjects.timePicker.setDefaultAbsoluteRange();
        await PageObjects.discover.waitUntilSearchingHasFinished();
      });

      runComparisonTests({
        comparisonDisplay: 'Comparing 2 documents',
        tableHeaders: ['Field', 'AU_x3_g4GFA8no6QjkYX', 'AU_x3-TcGFA8no6Qjipx'],
        fullFieldNames: [
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
        ],
        selectedFieldNames: ['@timestamp', 'extension', 'bytes', '@message', 'agent'],
        extensionRowIndex: 1,
        bytesRowIndex: 2,
      });
    });

    describe('ES|QL mode', () => {
      before(async () => {
        await PageObjects.common.navigateToApp('discover');
        await PageObjects.timePicker.setDefaultAbsoluteRange();
        await PageObjects.discover.selectTextBaseLang();
        await monacoEditor.setCodeEditorValue('from logstash-* | sort @timestamp desc | limit 10');
        await testSubjects.click('querySubmitButton');
        await PageObjects.discover.waitUntilSearchingHasFinished();
      });

      runComparisonTests({
        comparisonDisplay: 'Comparing 2 results',
        tableHeaders: ['Field', 'Result 1', 'Result 2'],
        fullFieldNames: [
          '@timestamp',
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
        ],
        selectedFieldNames: ['extension', 'bytes', '@message', 'agent'],
        extensionRowIndex: 0,
        bytesRowIndex: 1,
      });
    });
  });

  function runComparisonTests({
    comparisonDisplay,
    tableHeaders,
    fullFieldNames,
    selectedFieldNames,
    extensionRowIndex,
    bytesRowIndex,
  }: {
    comparisonDisplay: string;
    tableHeaders: string[];
    fullFieldNames: string[];
    selectedFieldNames: string[];
    extensionRowIndex: number;
    bytesRowIndex: number;
  }) {
    it('should allow comparing documents', async () => {
      await dataGrid.selectRow(0);
      expect(await dataGrid.compareSelectedButtonExists()).to.be(false);
      await dataGrid.selectRow(1);
      expect(await dataGrid.compareSelectedButtonExists()).to.be(true);
      await dataGrid.clickCompareSelectedButton();
      await dataGrid.waitForComparisonModeToLoad();
      expect(await dataGrid.getComparisonDisplay()).to.be(comparisonDisplay);
    });

    it('should allow selecting comparison fields', async () => {
      const headers = await dataGrid.getHeaders();
      expect(headers).to.eql(tableHeaders);
      let fieldNames = await dataGrid.getComparisonFieldNames();
      expect(fieldNames.length >= fullFieldNames.length).to.be(true);
      expect(fieldNames.slice(0, fullFieldNames.length)).to.eql(fullFieldNames);
      await dataGrid.openComparisonSettingsMenu();
      expect(await dataGrid.showAllFieldsSwitchExists()).to.be(false);
      await PageObjects.unifiedFieldList.clickFieldListItemAdd('extension');
      await PageObjects.unifiedFieldList.clickFieldListItemAdd('bytes');
      await PageObjects.unifiedFieldList.clickFieldListItemAdd('@message');
      await PageObjects.unifiedFieldList.clickFieldListItemAdd('agent');
      fieldNames = await dataGrid.getComparisonFieldNames();
      expect(fieldNames).have.length(selectedFieldNames.length);
      expect(fieldNames).to.eql(selectedFieldNames);
    });

    const testDiffMode = async ({
      diffMode,
      expectedExtensionValues,
      expectedBytesValues,
    }: {
      diffMode?: Parameters<typeof dataGrid.selectComparisonDiffMode>[0];
      expectedExtensionValues: string[];
      expectedBytesValues: string[];
    }) => {
      if (diffMode) {
        await dataGrid.selectComparisonDiffMode(diffMode);
      }
      const extensionRow = await dataGrid.getComparisonRow(extensionRowIndex);
      expect(extensionRow.fieldName).to.be('extension');
      expect(extensionRow.values).to.eql(expectedExtensionValues);
      const bytesRow = await dataGrid.getComparisonRow(bytesRowIndex);
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
    });

    it('should allow toggling show diff switch', async () => {
      await dataGrid.toggleShowDiffSwitch();
      await testDiffMode({
        expectedExtensionValues: ['jpg', 'jpg'],
        expectedBytesValues: ['7,124', '5,453'],
      });
      await dataGrid.toggleShowDiffSwitch();
    });

    it('should allow toggling all fields', async () => {
      await dataGrid.selectComparisonDiffMode('basic');
      await dataGrid.toggleShowAllFieldsSwitch();
      const fieldNames = await dataGrid.getComparisonFieldNames();
      expect(fieldNames.length >= fullFieldNames.length).to.be(true);
      await dataGrid.toggleShowAllFieldsSwitch();
    });

    it('should allow toggling matching values', async () => {
      let fieldNames = await dataGrid.getComparisonFieldNames();
      expect(fieldNames).have.length(selectedFieldNames.length);
      await dataGrid.toggleShowMatchingValuesSwitch();
      fieldNames = await dataGrid.getComparisonFieldNames();
      expect(fieldNames).have.length(selectedFieldNames.length - 1);
      expect(fieldNames).to.eql(selectedFieldNames.filter((name) => name !== 'extension'));
      await dataGrid.toggleShowMatchingValuesSwitch();
    });

    it('should allow toggling diff decorations', async () => {
      await dataGrid.selectComparisonDiffMode('words');
      let diffSegments = await dataGrid.getComparisonDiffSegments(bytesRowIndex, 2);
      expect(diffSegments).to.eql([
        { decoration: 'removed', value: '7124' },
        { decoration: 'added', value: '5453' },
      ]);
      await dataGrid.toggleShowDiffDecorationsSwitch();
      diffSegments = await dataGrid.getComparisonDiffSegments(bytesRowIndex, 2);
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
  }
}
