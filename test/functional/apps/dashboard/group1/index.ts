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
    loadTestFile(require.resolve('./url_field_formatter'));
    loadTestFile(require.resolve('./embeddable_rendering'));
    loadTestFile(require.resolve('./embeddable_data_grid'));
    loadTestFile(require.resolve('./create_and_add_embeddables'));
    loadTestFile(require.resolve('./edit_embeddable_redirects'));
    loadTestFile(require.resolve('./dashboard_unsaved_state'));
    loadTestFile(require.resolve('./dashboard_unsaved_listing'));
    loadTestFile(require.resolve('./edit_visualizations'));
  });
}
