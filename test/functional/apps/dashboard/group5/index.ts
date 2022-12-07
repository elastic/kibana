/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, loadTestFile }: FtrProviderContext) {
  const browser = getService('browser');
  const esArchiver = getService('esArchiver');

  async function loadCurrentData() {
    await browser.setWindowSize(1300, 900);
    await esArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
    await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/dashboard/current/data');
  }

  async function unloadCurrentData() {
    await esArchiver.unload('test/functional/fixtures/es_archiver/dashboard/current/data');
  }

  describe('dashboard app - group 1', function () {
    before(loadCurrentData);
    after(unloadCurrentData);

    // This has to be first since the other tests create some embeddables as side affects and our counting assumes
    // a fresh index.
    loadTestFile(require.resolve('./empty_dashboard'));
    loadTestFile(require.resolve('./dashboard_options'));
    loadTestFile(require.resolve('./data_shared_attributes'));
    loadTestFile(require.resolve('./share'));
    loadTestFile(require.resolve('./embed_mode'));
    loadTestFile(require.resolve('./dashboard_back_button'));
    loadTestFile(require.resolve('./dashboard_error_handling'));
    loadTestFile(require.resolve('./legacy_urls'));
    loadTestFile(require.resolve('./saved_search_embeddable'));

    // Note: This one must be last because it unloads some data for one of its tests!
    // No, this isn't ideal, but loading/unloading takes so much time and these are all bunched
    // to improve efficiency...
    loadTestFile(require.resolve('./dashboard_query_bar'));
  });
}
