/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginFunctionalProviderContext } from '../../services';

export default function ({ getService, loadTestFile }: PluginFunctionalProviderContext) {
  const esArchiver = getService('esArchiver');

  // SKIPPED: https://github.com/elastic/kibana/issues/100060
  describe.skip('doc views', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/discover');
    });

    loadTestFile(require.resolve('./doc_views'));
  });
}
