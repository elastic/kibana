/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';

export default function ({ getService, getPageObjects }) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const log = getService('log');
  const browser = getService('browser');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['settings']);
  const testSubjects = getService('testSubjects');

  // Failing: See https://github.com/elastic/kibana/issues/95376
  describe.skip('runtime fields', function () {
    this.tags(['skipFirefox']);

    before(async function () {
      await browser.setWindowSize(1200, 800);
      await esArchiver.load('test/functional/fixtures/es_archiver/discover');
      // delete .kibana index and then wait for Kibana to re-create it
      await kibanaServer.uiSettings.replace({});
      await kibanaServer.uiSettings.update({});
    });

    after(async function afterAll() {
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaIndexPatterns();
      await PageObjects.settings.removeLogstashIndexPatternIfExist();
    });

    describe('create runtime field', function describeIndexTests() {
      const fieldName = 'atest';

      it('should create runtime field', async function () {
        await PageObjects.settings.navigateTo();
        await PageObjects.settings.clickKibanaIndexPatterns();
        await PageObjects.settings.clickIndexPatternLogstash();
        const startingCount = parseInt(await PageObjects.settings.getFieldsTabCount());
        await log.debug('add runtime field');
        await PageObjects.settings.addRuntimeField(fieldName, 'Keyword', "emit('hello world')");
        await retry.try(async function () {
          expect(parseInt(await PageObjects.settings.getFieldsTabCount())).to.be(startingCount + 1);
        });
      });

      it('should modify runtime field', async function () {
        await PageObjects.settings.filterField(fieldName);
        await testSubjects.click('editFieldFormat');
        await PageObjects.settings.setFieldType('Long');
        await PageObjects.settings.changeFieldScript('emit(6);');
        await testSubjects.find('changeWarning');
        await PageObjects.settings.clickSaveField();
        await PageObjects.settings.confirmSave();
      });

      it('should delete runtime field', async function () {
        await testSubjects.click('deleteField');
        await PageObjects.settings.confirmDelete();
      });
    });
  });
}
