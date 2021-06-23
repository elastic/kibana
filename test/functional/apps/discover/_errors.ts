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
  const toasts = getService('toasts');
  const PageObjects = getPageObjects(['common', 'discover', 'timePicker']);

  describe('errors', function describeIndexTests() {
    before(async function () {
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await esArchiver.load('test/functional/fixtures/es_archiver/invalid_scripted_field');
      await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
      await PageObjects.common.navigateToApp('discover');
    });

    after(async function () {
      await esArchiver.load('test/functional/fixtures/es_archiver/empty_kibana');
    });

    describe('invalid scripted field error', () => {
      it('is rendered', async () => {
        const toast = await toasts.getToastElement(1);
        const painlessStackTrace = await toast.findByTestSubject('painlessStackTrace');
        expect(painlessStackTrace).not.to.be(undefined);
      });
    });
  });
}
