/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const retry = getService('retry');
  const log = getService('log');
  const browser = getService('browser');
  const PageObjects = getPageObjects(['common', 'console']);
  const remoteEsArchiver = getService('remoteEsArchiver' as 'esArchiver');

  describe('Console App CCS', function describeIndexTests() {
    this.tags('includeFirefox');
    before(async () => {
      await remoteEsArchiver.loadIfNeeded(
        'test/functional/fixtures/es_archiver/logstash_functional'
      );
      // resize the editor to allow the whole of the response to be displayed
      await browser.setWindowSize(1200, 1800);
      log.debug('navigateTo console');
      await PageObjects.common.navigateToApp('console');
      await retry.try(async () => {
        await PageObjects.console.collapseHelp();
      });
    });

    after(async () => {
      await remoteEsArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
    });

    describe('Perform CCS Search in Console', () => {
      before(async () => {
        await PageObjects.console.monaco.clearEditorText();
      });
      it('it should be able to access remote data', async () => {
        await PageObjects.console.monaco.enterText(
          '\nGET ftr-remote:logstash-*/_search\n {\n "query": {\n "bool": {\n "must": [\n {"match": {"extension" : "jpg"} \n}\n]\n}\n}\n}'
        );
        await PageObjects.console.clickPlay();
        await retry.try(async () => {
          const actualResponse = await PageObjects.console.monaco.getOutputText();
          expect(actualResponse).to.contain('"_index": "ftr-remote:logstash-2015.09.20"');
        });
      });
    });
  });
}
