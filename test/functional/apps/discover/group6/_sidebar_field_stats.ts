/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const { common, discover, timePicker, header, unifiedFieldList } = getPageObjects([
    'common',
    'discover',
    'timePicker',
    'header',
    'unifiedFieldList',
  ]);
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const monacoEditor = getService('monacoEditor');
  const retry = getService('retry');

  describe('discover sidebar field stats popover', function describeIndexTests() {
    before(async function () {
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
      await kibanaServer.uiSettings.replace({
        defaultIndex: 'logstash-*',
      });
    });

    after(async () => {
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover');
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.uiSettings.replace({});
    });

    describe('data view fields', function () {
      before(async () => {
        await timePicker.setDefaultAbsoluteRangeViaUiSettings();
        await common.navigateToApp('discover');
        await discover.waitUntilSearchingHasFinished();

        await discover.addRuntimeField('_is_large', 'emit(doc["bytes"].value > 1024)', 'boolean');

        await retry.waitFor('form to close', async () => {
          return !(await testSubjects.exists('fieldEditor'));
        });

        await header.waitUntilLoadingHasFinished();
        await unifiedFieldList.waitUntilSidebarHasLoaded();
      });

      it('should show a top values popover for a boolean runtime field', async () => {
        await unifiedFieldList.clickFieldListItem('_is_large');
        await testSubjects.existOrFail('dscFieldStats-topValues');
        expect(await testSubjects.getVisibleText('dscFieldStats-title')).to.be('Top values');
        const topValuesRows = await testSubjects.findAll('dscFieldStats-topValues-bucket');
        expect(topValuesRows.length).to.eql(2);
        await testSubjects.missingOrFail('unifiedFieldStats-buttonGroup');
        await testSubjects.missingOrFail('unifiedFieldStats-histogram');
        expect(await testSubjects.getVisibleText('dscFieldStats-statsFooter')).to.contain(
          '14,004 records'
        );
        await unifiedFieldList.closeFieldPopover();
      });

      it('should show a histogram and top values popover for numeric field', async () => {
        await unifiedFieldList.clickFieldListItem('bytes');
        await testSubjects.existOrFail('dscFieldStats-topValues');
        expect(await testSubjects.getVisibleText('dscFieldStats-title')).to.contain('Top values');
        expect(await testSubjects.getVisibleText('dscFieldStats-title')).to.contain('Distribution');
        const topValuesRows = await testSubjects.findAll('dscFieldStats-topValues-bucket');
        expect(topValuesRows.length).to.eql(11);
        await testSubjects.click('dscFieldStats-buttonGroup-distributionButton');
        expect(
          await find.existsByCssSelector('[data-test-subj="unifiedFieldStats-histogram"] .echChart')
        ).to.eql(true);
        expect(await testSubjects.getVisibleText('dscFieldStats-statsFooter')).to.contain(
          '14,004 records'
        );
        await unifiedFieldList.closeFieldPopover();
      });

      it('should show a top values popover for a keyword field', async () => {
        await unifiedFieldList.clickFieldListItem('extension');
        await testSubjects.existOrFail('dscFieldStats-topValues');
        expect(await testSubjects.getVisibleText('dscFieldStats-title')).to.be('Top values');
        const topValuesRows = await testSubjects.findAll('dscFieldStats-topValues-bucket');
        expect(topValuesRows.length).to.eql(5);
        await testSubjects.missingOrFail('unifiedFieldStats-buttonGroup');
        await testSubjects.missingOrFail('unifiedFieldStats-histogram');
        expect(await testSubjects.getVisibleText('dscFieldStats-statsFooter')).to.contain(
          '14,004 records'
        );
        await unifiedFieldList.closeFieldPopover();
      });

      it('should show a top values popover for an ip field', async () => {
        await unifiedFieldList.clickFieldListItem('clientip');
        await testSubjects.existOrFail('dscFieldStats-topValues');
        expect(await testSubjects.getVisibleText('dscFieldStats-title')).to.be('Top values');
        const topValuesRows = await testSubjects.findAll('dscFieldStats-topValues-bucket');
        expect(topValuesRows.length).to.eql(11);
        await testSubjects.missingOrFail('unifiedFieldStats-buttonGroup');
        await testSubjects.missingOrFail('unifiedFieldStats-histogram');
        expect(await testSubjects.getVisibleText('dscFieldStats-statsFooter')).to.contain(
          '14,004 records'
        );
        await unifiedFieldList.closeFieldPopover();
      });

      it('should show a date histogram popover for a date field', async () => {
        await unifiedFieldList.clickFieldListItem('@timestamp');
        await testSubjects.existOrFail('unifiedFieldStats-timeDistribution');
        await testSubjects.missingOrFail('dscFieldStats-buttonGroup-topValuesButton');
        expect(await testSubjects.getVisibleText('dscFieldStats-statsFooter')).to.contain(
          '14,004 records'
        );
        await unifiedFieldList.closeFieldPopover();
      });

      it('should show examples for geo points field', async () => {
        await unifiedFieldList.clickFieldListItem('geo.coordinates');
        await testSubjects.existOrFail('dscFieldStats-topValues');
        expect(await testSubjects.getVisibleText('dscFieldStats-title')).to.be('Examples');
        const topValuesRows = await testSubjects.findAll('dscFieldStats-topValues-bucket');
        expect(topValuesRows.length).to.eql(11);
        await testSubjects.missingOrFail('unifiedFieldStats-buttonGroup');
        await testSubjects.missingOrFail('unifiedFieldStats-histogram');
        expect(await testSubjects.getVisibleText('dscFieldStats-statsFooter')).to.contain(
          '100 sample records'
        );
        await unifiedFieldList.closeFieldPopover();
      });
    });

    describe('ES|QL columns', function () {
      beforeEach(async () => {
        await timePicker.setDefaultAbsoluteRangeViaUiSettings();
        await common.navigateToApp('discover');
        await discover.waitUntilSearchingHasFinished();

        await discover.selectTextBaseLang();

        const testQuery = `from logstash-* [METADATA _index, _id] | sort @timestamp desc | limit 500`;
        await monacoEditor.setCodeEditorValue(testQuery);
        await testSubjects.click('querySubmitButton');
        await header.waitUntilLoadingHasFinished();
        await unifiedFieldList.waitUntilSidebarHasLoaded();
      });

      it('should show top values popover for numeric field', async () => {
        await unifiedFieldList.clickFieldListItem('bytes');
        await testSubjects.existOrFail('dscFieldStats-topValues');
        expect(await testSubjects.getVisibleText('dscFieldStats-title')).to.be('Top values');
        const topValuesRows = await testSubjects.findAll('dscFieldStats-topValues-bucket');
        expect(topValuesRows.length).to.eql(10);
        expect(await testSubjects.getVisibleText('dscFieldStats-statsFooter')).to.contain(
          '42 sample values'
        );

        await unifiedFieldList.clickFieldListPlusFilter('bytes', '0');
        const editorValue = await monacoEditor.getCodeEditorValue();
        expect(editorValue).to.eql(
          `from logstash-* [METADATA _index, _id] | sort @timestamp desc | limit 500\n| WHERE \`bytes\`==0`
        );
        await unifiedFieldList.closeFieldPopover();
      });

      it('should show a top values popover for a keyword field', async () => {
        await unifiedFieldList.clickFieldListItem('extension.raw');
        await testSubjects.existOrFail('dscFieldStats-topValues');
        expect(await testSubjects.getVisibleText('dscFieldStats-title')).to.be('Top values');
        const topValuesRows = await testSubjects.findAll('dscFieldStats-topValues-bucket');
        expect(topValuesRows.length).to.eql(5);
        await testSubjects.missingOrFail('unifiedFieldStats-buttonGroup');
        await testSubjects.missingOrFail('unifiedFieldStats-histogram');
        expect(await testSubjects.getVisibleText('dscFieldStats-statsFooter')).to.contain(
          '500 sample values'
        );

        await unifiedFieldList.clickFieldListPlusFilter('extension.raw', 'css');
        const editorValue = await monacoEditor.getCodeEditorValue();
        expect(editorValue).to.eql(
          `from logstash-* [METADATA _index, _id] | sort @timestamp desc | limit 500\n| WHERE \`extension.raw\`=="css"`
        );

        await unifiedFieldList.closeFieldPopover();
      });

      it('should show a top values popover for an ip field', async () => {
        await unifiedFieldList.clickFieldListItem('clientip');
        await testSubjects.existOrFail('dscFieldStats-topValues');
        expect(await testSubjects.getVisibleText('dscFieldStats-title')).to.be('Top values');
        const topValuesRows = await testSubjects.findAll('dscFieldStats-topValues-bucket');
        expect(topValuesRows.length).to.eql(10);
        await testSubjects.missingOrFail('unifiedFieldStats-buttonGroup');
        await testSubjects.missingOrFail('unifiedFieldStats-histogram');
        expect(await testSubjects.getVisibleText('dscFieldStats-statsFooter')).to.contain(
          '32 sample values'
        );

        await unifiedFieldList.clickFieldListPlusFilter('clientip', '216.126.255.31');
        const editorValue = await monacoEditor.getCodeEditorValue();
        expect(editorValue).to.eql(
          `from logstash-* [METADATA _index, _id] | sort @timestamp desc | limit 500\n| WHERE \`clientip\`::string=="216.126.255.31"`
        );

        await unifiedFieldList.closeFieldPopover();
      });

      it('should show a top values popover for _index field', async () => {
        await unifiedFieldList.clickFieldListItem('_index');
        await testSubjects.existOrFail('dscFieldStats-topValues');
        expect(await testSubjects.getVisibleText('dscFieldStats-title')).to.be('Top values');
        const topValuesRows = await testSubjects.findAll('dscFieldStats-topValues-bucket');
        expect(topValuesRows.length).to.eql(1);
        await testSubjects.missingOrFail('unifiedFieldStats-buttonGroup');
        await testSubjects.missingOrFail('unifiedFieldStats-histogram');
        expect(await testSubjects.getVisibleText('dscFieldStats-statsFooter')).to.contain(
          '500 sample values'
        );
        await unifiedFieldList.closeFieldPopover();
      });

      it('should not have stats for a date field yet but create an is not null filter', async () => {
        await unifiedFieldList.clickFieldListItem('@timestamp');
        await unifiedFieldList.clickFieldListExistsFilter('@timestamp');
        const editorValue = await monacoEditor.getCodeEditorValue();
        expect(editorValue).to.eql(
          `from logstash-* [METADATA _index, _id] | sort @timestamp desc | limit 500\n| WHERE \`@timestamp\` is not null`
        );
        await testSubjects.missingOrFail('dscFieldStats-statsFooter');
        await unifiedFieldList.closeFieldPopover();
      });

      it('should show examples for geo points field', async () => {
        await unifiedFieldList.clickFieldListItem('geo.coordinates');
        await testSubjects.existOrFail('dscFieldStats-topValues');
        expect(await testSubjects.getVisibleText('dscFieldStats-title')).to.be('Examples');
        const topValuesRows = await testSubjects.findAll('dscFieldStats-topValues-bucket');
        expect(topValuesRows.length).to.eql(11);
        await testSubjects.missingOrFail('unifiedFieldStats-buttonGroup');
        await testSubjects.missingOrFail('unifiedFieldStats-histogram');
        expect(await testSubjects.getVisibleText('dscFieldStats-statsFooter')).to.contain(
          '100 sample records'
        );
        await unifiedFieldList.closeFieldPopover();
      });

      it('should show examples for text field', async () => {
        await unifiedFieldList.clickFieldListItem('extension');
        await testSubjects.existOrFail('dscFieldStats-topValues');
        expect(await testSubjects.getVisibleText('dscFieldStats-title')).to.be('Examples');
        const topValuesRows = await testSubjects.findAll('dscFieldStats-topValues-bucket');
        expect(topValuesRows.length).to.eql(5);
        await testSubjects.missingOrFail('unifiedFieldStats-buttonGroup');
        await testSubjects.missingOrFail('unifiedFieldStats-histogram');
        expect(await testSubjects.getVisibleText('dscFieldStats-statsFooter')).to.contain(
          '100 sample records'
        );

        await unifiedFieldList.clickFieldListPlusFilter('extension', 'css');
        const editorValue = await monacoEditor.getCodeEditorValue();
        expect(editorValue).to.eql(
          `from logstash-* [METADATA _index, _id] | sort @timestamp desc | limit 500\n| WHERE \`extension\`=="css"`
        );

        await unifiedFieldList.closeFieldPopover();
      });

      it('should show examples for _id field', async () => {
        await unifiedFieldList.clickFieldListItem('_id');
        await testSubjects.existOrFail('dscFieldStats-topValues');
        expect(await testSubjects.getVisibleText('dscFieldStats-title')).to.be('Examples');
        const topValuesRows = await testSubjects.findAll('dscFieldStats-topValues-bucket');
        expect(topValuesRows.length).to.eql(11);
        await testSubjects.missingOrFail('unifiedFieldStats-buttonGroup');
        await testSubjects.missingOrFail('unifiedFieldStats-histogram');
        expect(await testSubjects.getVisibleText('dscFieldStats-statsFooter')).to.contain(
          '100 sample records'
        );
        await unifiedFieldList.closeFieldPopover();
      });

      it('should show a top values popover for a more complex query', async () => {
        const testQuery = `from logstash-* | sort @timestamp desc | limit 50 | stats avg(bytes) by geo.dest | limit 3`;
        await monacoEditor.setCodeEditorValue(testQuery);
        await testSubjects.click('querySubmitButton');
        await header.waitUntilLoadingHasFinished();
        await unifiedFieldList.waitUntilSidebarHasLoaded();

        await unifiedFieldList.clickFieldListItem('avg(bytes)');
        await testSubjects.existOrFail('dscFieldStats-topValues');
        expect(await testSubjects.getVisibleText('dscFieldStats-title')).to.be('Top values');
        const topValuesRows = await testSubjects.findAll('dscFieldStats-topValues-bucket');
        expect(topValuesRows.length).to.eql(3);
        expect(await testSubjects.getVisibleText('dscFieldStats-statsFooter')).to.contain(
          '3 sample values'
        );

        await unifiedFieldList.clickFieldListPlusFilter('avg(bytes)', '5453');
        const editorValue = await monacoEditor.getCodeEditorValue();
        expect(editorValue).to.eql(
          `from logstash-* | sort @timestamp desc | limit 50 | stats avg(bytes) by geo.dest | limit 3\n| WHERE \`avg(bytes)\`==5453`
        );

        await unifiedFieldList.closeFieldPopover();
      });

      it('should show a top values popover for a boolean field', async () => {
        const testQuery = `row enabled = true`;
        await monacoEditor.setCodeEditorValue(testQuery);
        await testSubjects.click('querySubmitButton');
        await header.waitUntilLoadingHasFinished();
        await unifiedFieldList.waitUntilSidebarHasLoaded();

        await unifiedFieldList.clickFieldListItem('enabled');
        await testSubjects.existOrFail('dscFieldStats-topValues');
        expect(await testSubjects.getVisibleText('dscFieldStats-title')).to.be('Top values');
        const topValuesRows = await testSubjects.findAll('dscFieldStats-topValues-bucket');
        expect(topValuesRows.length).to.eql(1);
        expect(await unifiedFieldList.getFieldStatsTopValueBucketsVisibleText()).to.be(
          'true\n100%'
        );
        expect(await testSubjects.getVisibleText('dscFieldStats-statsFooter')).to.contain(
          '1 sample value'
        );

        await unifiedFieldList.clickFieldListMinusFilter('enabled', 'true');
        const editorValue = await monacoEditor.getCodeEditorValue();
        expect(editorValue).to.eql(`row enabled = true\n| WHERE \`enabled\`!=true`);
        await unifiedFieldList.closeFieldPopover();
      });
    });
  });
}
