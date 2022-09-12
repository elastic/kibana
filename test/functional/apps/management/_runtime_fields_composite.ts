/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const log = getService('log');
  const browser = getService('browser');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['settings']);
  const testSubjects = getService('testSubjects');

  describe('runtime fields', function () {
    this.tags(['skipFirefox']);

    before(async function () {
      await browser.setWindowSize(1200, 800);
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
      await kibanaServer.uiSettings.replace({});
    });

    after(async function afterAll() {
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover');
    });

    describe('create composite runtime field', function describeIndexTests() {
      // Starting with '@' to sort toward start of field list
      const fieldName = '@composite_test';

      it('should create runtime field', async function () {
        await PageObjects.settings.navigateTo();
        await PageObjects.settings.clickKibanaIndexPatterns();
        await PageObjects.settings.clickIndexPatternLogstash();
        const startingCount = parseInt(await PageObjects.settings.getFieldsTabCount(), 10);
        await log.debug('add runtime field');
        await PageObjects.settings.addCompositeRuntimeField(
          fieldName,
          "emit('a','hello world')",
          false,
          1
        );

        await log.debug('check that field preview is rendered');
        expect(await testSubjects.exists('fieldPreviewItem', { timeout: 1500 })).to.be(true);

        await PageObjects.settings.clickSaveField();

        await retry.try(async function () {
          expect(parseInt(await PageObjects.settings.getFieldsTabCount(), 10)).to.be(
            startingCount + 1
          );
        });
      });

      it('should modify runtime field', async function () {
        const startingCount = parseInt(await PageObjects.settings.getFieldsTabCount(), 10);
        await PageObjects.settings.filterField(fieldName);
        await testSubjects.click('editFieldFormat');
        // wait for subfields to render
        await testSubjects.find(`typeField_0`);
        await new Promise((e) => setTimeout(e, 2000));
        await PageObjects.settings.setCompositeScript("emit('a',6);emit('b',10);");

        // wait for subfields to render
        await testSubjects.find(`typeField_1`);
        await new Promise((e) => setTimeout(e, 500));

        await PageObjects.settings.clickSaveField();
        await testSubjects.click('clearSearchButton');
        await retry.try(async function () {
          expect(parseInt(await PageObjects.settings.getFieldsTabCount(), 10)).to.be(
            startingCount + 1
          );
        });
      });

      it('should delete runtime field', async function () {
        await testSubjects.click('deleteField');
        await PageObjects.settings.confirmDelete();
      });
    });
  });
}
