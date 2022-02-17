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
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const toasts = getService('toasts');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common', 'header', 'discover', 'timePicker']);

  describe('errors', function describeIndexTests() {
    before(async function () {
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.savedObjects.clean({ types: ['search', 'index-pattern'] });
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/invalid_scripted_field'
      );
      await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
      await PageObjects.common.navigateToApp('discover');
    });

    after(async function () {
      await kibanaServer.savedObjects.clean({ types: ['search', 'index-pattern'] });
    });

    describe('invalid scripted field error', () => {
      it('is rendered', async () => {
        const toast = await toasts.getToastElement(1);
        const painlessStackTrace = await toast.findByTestSubject('painlessStackTrace');
        expect(painlessStackTrace).not.to.be(undefined);
      });
    });

    describe('not found', () => {
      it('should redirect to main page when trying to access invalid route', async () => {
        await PageObjects.common.navigateToUrl('discover', '#/invalid-route', {
          useActualUrl: true,
        });
        await PageObjects.header.awaitKibanaChrome();

        const invalidLink = await testSubjects.find('invalidRouteMessage');
        expect(await invalidLink.getVisibleText()).to.be(
          `Discover application doesn't recognize this route: /invalid-route`
        );
      });
    });
  });
}
