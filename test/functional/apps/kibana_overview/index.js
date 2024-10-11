/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export default function ({ getService, loadTestFile }) {
  const browser = getService('browser');

  describe('kibana overview app', function () {
    before(function () {
      return browser.setWindowSize(1200, 800);
    });

    loadTestFile(require.resolve('./_no_data'));
    loadTestFile(require.resolve('./_page_header'));
    loadTestFile(require.resolve('./_analytics'));
    loadTestFile(require.resolve('./_solutions'));
    loadTestFile(require.resolve('./_footer'));
  });
}
