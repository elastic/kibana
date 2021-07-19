/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export default function ({ getService, getPageObjects }) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const browser = getService('browser');
  const PageObjects = getPageObjects(['settings']);
  const testSubjects = getService('testSubjects');

  describe('field formatter', function () {
    this.tags(['skipFirefox']);

    before(async function () {
      await browser.setWindowSize(1200, 800);
      await esArchiver.load('test/functional/fixtures/es_archiver/discover');
      await kibanaServer.uiSettings.replace({});
      await kibanaServer.uiSettings.update({});
    });

    after(async function afterAll() {
      await PageObjects.settings.navigateTo();
      await esArchiver.emptyKibanaIndex();
    });

    describe('set and change field formatter', function describeIndexTests() {
      // addresses https://github.com/elastic/kibana/issues/93349
      it('can change format more than once', async function () {
        await PageObjects.settings.navigateTo();
        await PageObjects.settings.clickKibanaIndexPatterns();
        await PageObjects.settings.clickIndexPatternLogstash();
        await PageObjects.settings.clickAddField();
        await PageObjects.settings.setFieldType('Long');
        const formatRow = await testSubjects.find('formatRow');
        const formatRowToggle = (
          await formatRow.findAllByCssSelector('[data-test-subj="toggle"]')
        )[0];

        await formatRowToggle.click();
        await PageObjects.settings.setFieldFormat('duration');
        await PageObjects.settings.setFieldFormat('bytes');
        await PageObjects.settings.setFieldFormat('duration');
        await testSubjects.click('euiFlyoutCloseButton');
        await PageObjects.settings.closeIndexPatternFieldEditor();
      });
    });
  });
}
