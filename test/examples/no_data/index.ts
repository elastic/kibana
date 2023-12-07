/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { PLUGIN_ID as NO_DATA_PLUGIN_ID } from '@kbn/no-data-page-example-plugin/common';
import { FtrProviderContext } from '../../functional/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common']);
  const log = getService('log');
  const es = getService('es');

  describe('No Data Page Examples', () => {
    before(async () => {
      await PageObjects.common.navigateToApp(NO_DATA_PLUGIN_ID);
      await testSubjects.existOrFail('noDataPageExampleHeader');
    });

    it('determine when user has no API keys', async () => {
      await retry.try(async () => {
        const sectionText = await testSubjects.getVisibleText('noDataPageExampleHasApiKeysResult');
        expect(sectionText).to.be('Current user has API keys: unknown');
      });

      log.debug('clicking button for checking API keys');
      await testSubjects.click('noDataPageExampleHasApiKeysClick');

      await retry.try(async () => {
        const sectionText = await testSubjects.getVisibleText('noDataPageExampleHasApiKeysResult');
        expect(sectionText).to.be('Current user has API keys: no');
      });
    });

    // can not be tested with example plugins tests server
    it.skip('determine when user has API key(s)', async () => {
      const { id: keyId } = await es.security.createApiKey({
        name: 'key-for-test',
      });

      await retry.try(async () => {
        const sectionText = await testSubjects.getVisibleText('noDataPageExampleHasApiKeysResult');
        expect(sectionText).to.be('Current user has API keys: unknown');
      });

      log.debug('clicking button for checking API keys');
      await testSubjects.click('noDataPageExampleHasApiKeysClick');

      await retry.try(async () => {
        const sectionText = await testSubjects.getVisibleText('noDataPageExampleHasApiKeysResult');
        expect(sectionText).to.be('Current user has API keys: yes');
      });

      await es.security.invalidateApiKey({
        id: keyId,
      });
    });
  });
}
