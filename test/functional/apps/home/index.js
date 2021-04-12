/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export default function ({ getService, loadTestFile }) {
  const browser = getService('browser');

  describe('homepage app', function () {
    this.tags('ciGroup6');

    before(function () {
      return browser.setWindowSize(1200, 800);
    });

    loadTestFile(require.resolve('./_navigation'));
    loadTestFile(require.resolve('./_home'));
    loadTestFile(require.resolve('./_newsfeed'));
    loadTestFile(require.resolve('./_add_data'));
    loadTestFile(require.resolve('./_sample_data'));
  });
}
