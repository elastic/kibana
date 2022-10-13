/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* Steps for version conflict test
 1. Create index pattern
 2. Click on  scripted field and fill in the values
 3. Use es to update the index pattern's title
 4. Try to save the scripted field
 5. Kibana should display the message - you need to refresh the index pattern

 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const kibanaServer = getService('kibanaServer');
  const browser = getService('browser');
  const es = getService('es');
  const retry = getService('retry');
  const scriptedFiledName = 'versionConflictScript';
  const PageObjects = getPageObjects(['common', 'home', 'settings', 'discover', 'header']);
  const log = getService('log');

  describe('index version conflict', function describeIndexTests() {
    before(async function () {
      await browser.setWindowSize(1200, 800);
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
    });

    after(async () => {
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover');
    });

    it('Should be able to surface version conflict notification while creating scripted field', async function () {
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaIndexPatterns();
      await PageObjects.settings.clickIndexPatternLogstash();
      await PageObjects.settings.clickScriptedFieldsTab();
      await PageObjects.settings.clickAddScriptedField();
      await PageObjects.settings.setScriptedFieldName(scriptedFiledName);
      await PageObjects.settings.setScriptedFieldScript(`doc['bytes'].value`);
      const response = await es.update(
        {
          index: '.kibana',
          id: 'index-pattern:logstash-*',
          body: {
            doc: { 'index-pattern': { fieldFormatMap: '{"geo.src":{"id":"number"}}' } },
          },
        },
        { meta: true }
      );
      log.debug(JSON.stringify(response));
      expect(response.body.result).to.be('updated');
      await PageObjects.settings.setFieldFormat('url');
      await PageObjects.settings.clickSaveScriptedField();
      await retry.try(async function () {
        const message = await PageObjects.common.closeToast();
        expect(message).to.contain('Unable');
      });
    });

    it('Should be able to surface version conflict notification while changing field format', async function () {
      const fieldName = 'geo.srcdest';
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaIndexPatterns();
      await PageObjects.settings.clickIndexPatternLogstash();
      log.debug('Starting openControlsByName (' + fieldName + ')');
      await PageObjects.settings.openControlsByName(fieldName);
      log.debug('controls are open');
      await (
        await (
          await testSubjects.find('formatRow')
        ).findAllByCssSelector('[data-test-subj="toggle"]')
      )[0].click();
      await PageObjects.settings.setFieldFormat('url');
      const response = await es.update(
        {
          index: '.kibana',
          id: 'index-pattern:logstash-*',
          body: {
            doc: { 'index-pattern': { fieldFormatMap: '{"geo.dest":{"id":"number"}}' } },
          },
        },
        { meta: true }
      );
      log.debug(JSON.stringify(response));
      expect(response.body.result).to.be('updated');
      await PageObjects.settings.controlChangeSave();
      await retry.try(async function () {
        const message = await PageObjects.common.closeToast();
        expect(message).to.contain('Unable');
      });
    });
  });
}
