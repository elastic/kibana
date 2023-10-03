/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, loadTestFile }: FtrProviderContext) {
  const browser = getService('browser');

  describe('home app', function () {
    before(function () {
      return browser.setWindowSize(1200, 800);
    });

    loadTestFile(require.resolve('./_navigation'));
    loadTestFile(require.resolve('./_home'));
    loadTestFile(require.resolve('./_newsfeed'));
    loadTestFile(require.resolve('./_add_data'));
    loadTestFile(require.resolve('./_sample_data'));
    loadTestFile(require.resolve('./_welcome'));
    loadTestFile(require.resolve('./_breadcrumbs'));
  });
}
