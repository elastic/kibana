/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['settings']);
  const testSubjects = getService('testSubjects');

  describe('edit field', function () {
    before(async function () {
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
    });

    after(async function afterAll() {
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover');
    });

    describe('field preview', function fieldPreview() {
      before(async () => {
        await PageObjects.settings.navigateTo();
        await PageObjects.settings.clickKibanaIndexPatterns();
        await PageObjects.settings.clickIndexPatternLogstash();
      });

      it('should show preview for fields in _source', async function () {
        await PageObjects.settings.filterField('extension');
        await testSubjects.click('editFieldFormat');
        await testSubjects.find('value');
        let previewText = '';
        await retry.waitForWithTimeout('get preview value', 1000, async () => {
          previewText = await testSubjects.getVisibleText('value');
          return previewText !== 'Value not set';
        });
        expect(previewText).to.be('css');
        await PageObjects.settings.closeIndexPatternFieldEditor();
      });

      it('should show preview for fields not in _source', async function () {
        await PageObjects.settings.filterField('extension.raw');
        await testSubjects.click('editFieldFormat');
        await testSubjects.find('value');
        let previewText = '';
        await retry.waitForWithTimeout('get preview value', 1000, async () => {
          previewText = await testSubjects.getVisibleText('value');
          return previewText !== 'Value not set';
        });
        expect(previewText).to.be('css');
        await PageObjects.settings.closeIndexPatternFieldEditor();
      });
    });
  });
}
