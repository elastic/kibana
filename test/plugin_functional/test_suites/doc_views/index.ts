/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { PluginFunctionalProviderContext } from '../../services';

export default function ({ getService, loadTestFile }: PluginFunctionalProviderContext) {
  const esArchiver = getService('esArchiver');

  describe('doc views', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('../functional/fixtures/es_archiver/discover');
    });

    loadTestFile(require.resolve('./doc_views'));
  });
}
