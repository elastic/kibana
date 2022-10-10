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
  const kibanaServer = getService('kibanaServer');
  const log = getService('log');
  const dataGrid = getService('dataGrid');
  const testSubjects = getService('testSubjects');
  const monacoEditor = getService('monacoEditor');
  const security = getService('security');
  const PageObjects = getPageObjects(['common', 'discover', 'header', 'timePicker']);

  const defaultSettings = {
    defaultIndex: 'logstash-*',
    'discover:enableSql': true,
  };

  describe('discover sql view', async function () {
    before(async () => {
      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader']);
      log.debug('load kibana index with default index pattern');
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
      // and load a set of makelogs data
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.uiSettings.replace(defaultSettings);
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.timePicker.setDefaultAbsoluteRange();
    });

    describe('test', () => {
      it('should render sql view correctly', async function () {
        expect(await testSubjects.exists('showQueryBarMenu')).to.be(true);
        expect(await testSubjects.exists('superDatePickerToggleQuickMenuButton')).to.be(true);
        expect(await testSubjects.exists('addFilter')).to.be(true);
        expect(await testSubjects.exists('dscViewModeDocumentButton')).to.be(true);
        expect(await testSubjects.exists('discoverChart')).to.be(true);
        expect(await testSubjects.exists('discoverQueryHits')).to.be(true);
        expect(await testSubjects.exists('discoverAlertsButton')).to.be(true);
        expect(await testSubjects.exists('shareTopNavButton')).to.be(true);
        expect(await testSubjects.exists('docTableExpandToggleColumn')).to.be(true);
        expect(await testSubjects.exists('dataGridColumnSortingButton')).to.be(true);
        expect(await testSubjects.exists('fieldFilterSearchInput')).to.be(true);
        expect(await testSubjects.exists('toggleFieldFilterButton')).to.be(true);
        expect(await testSubjects.exists('fieldTypesHelpButton')).to.be(true);
        await testSubjects.click('field-@message-showDetails');
        expect(await testSubjects.exists('discoverFieldListPanelEdit-@message')).to.be(true);

        await PageObjects.discover.selectTextBaseLang('SQL');

        expect(await testSubjects.exists('fieldFilterSearchInput')).to.be(true);
        expect(await testSubjects.exists('unifiedTextLangEditor')).to.be(true);
        expect(await testSubjects.exists('superDatePickerToggleQuickMenuButton')).to.be(true);

        expect(await testSubjects.exists('showQueryBarMenu')).to.be(false);
        expect(await testSubjects.exists('addFilter')).to.be(false);
        expect(await testSubjects.exists('dscViewModeDocumentButton')).to.be(false);
        expect(await testSubjects.exists('discoverChart')).to.be(false);
        expect(await testSubjects.exists('discoverQueryHits')).to.be(false);
        expect(await testSubjects.exists('discoverAlertsButton')).to.be(false);
        expect(await testSubjects.exists('shareTopNavButton')).to.be(false);
        expect(await testSubjects.exists('docTableExpandToggleColumn')).to.be(false);
        expect(await testSubjects.exists('dataGridColumnSortingButton')).to.be(false);
        expect(await testSubjects.exists('toggleFieldFilterButton')).to.be(false);
        expect(await testSubjects.exists('fieldTypesHelpButton')).to.be(false);
        await testSubjects.click('field-@message-showDetails');
        expect(await testSubjects.exists('discoverFieldListPanelEditItem')).to.be(false);
      });

      it('should perform test query correctly', async function () {
        await PageObjects.discover.selectTextBaseLang('SQL');
        const testQuery = `SELECT "@tags", geo.dest, count(*) occurred FROM "logstash-*"
          GROUP BY "@tags", geo.dest
          HAVING occurred > 20
          ORDER BY occurred DESC`;

        await monacoEditor.setCodeEditorValue(testQuery);
        await testSubjects.click('querySubmitButton');
        await PageObjects.header.waitUntilLoadingHasFinished();

        const cell = await dataGrid.getCellElement(0, 3);
        expect(await cell.getVisibleText()).to.be('2269');
      });
    });
  });
}
