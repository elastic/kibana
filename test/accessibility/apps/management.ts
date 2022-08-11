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
  const PageObjects = getPageObjects([
    'common',
    'settings',
    'header',
    'indexPatternFieldEditorObjects',
  ]);
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const a11y = getService('a11y');
  const testSubjects = getService('testSubjects');

  describe('Management', () => {
    it('main view', async () => {
      await a11y.testAppSnapshot();
    });

    describe('data views', async () => {
      before(async () => {
        await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
        await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
        await kibanaServer.uiSettings.update({
          defaultIndex: 'logstash-*',
        });
        await PageObjects.settings.navigateTo();
      });
      after(async () => {
        await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover');
        await esArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
      });
      it('index pattern page', async () => {
        await PageObjects.settings.clickKibanaIndexPatterns();
        await a11y.testAppSnapshot();
      });

      it('Single indexpattern view', async () => {
        await PageObjects.settings.clickIndexPatternLogstash();
        await PageObjects.header.waitUntilLoadingHasFinished();
        await a11y.testAppSnapshot();
      });

      it('Index pattern field editor - initial view', async () => {
        await PageObjects.settings.clickAddField();
        await a11y.testAppSnapshot();
      });

      it('Index pattern field editor - all options shown', async () => {
        await PageObjects.settings.setFieldName('test');
        await PageObjects.settings.setFieldType('Keyword');
        await PageObjects.settings.setFieldScript("emit('hello world')");
        await PageObjects.settings.toggleRow('formatRow');
        await PageObjects.settings.setFieldFormat('string');
        await PageObjects.settings.toggleRow('customLabelRow');
        await PageObjects.settings.setCustomLabel('custom label');
        await testSubjects.click('toggleAdvancedSetting');
        // Let's make sure the field preview is visible before testing the snapshot
        const isFieldPreviewVisible =
          await PageObjects.indexPatternFieldEditorObjects.isFieldPreviewVisible();
        expect(isFieldPreviewVisible).to.be(true);

        await a11y.testAppSnapshot();

        await PageObjects.settings.closeIndexPatternFieldEditor();
      });

      it('Open create index pattern wizard', async () => {
        await PageObjects.settings.clickKibanaIndexPatterns();
        await PageObjects.settings.clickAddNewIndexPatternButton();
        await PageObjects.header.waitUntilLoadingHasFinished();
        await a11y.testAppSnapshot();
        await testSubjects.click('closeFlyoutButton');
      });

      // We are navigating back to index pattern page to test field formatters
      it('Navigate back to logstash index page', async () => {
        await PageObjects.settings.clickKibanaIndexPatterns();
        await PageObjects.settings.clickIndexPatternLogstash();
        await a11y.testAppSnapshot();
      });

      it('Edit field type', async () => {
        await PageObjects.settings.clickEditFieldFormat();
        await a11y.testAppSnapshot();
        await PageObjects.settings.closeIndexPatternFieldEditor();
      });

      it('Advanced settings', async () => {
        await PageObjects.settings.clickKibanaSettings();
        await a11y.testAppSnapshot();
      });
    });
  });
}
