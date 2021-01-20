/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export default function ({ getService, loadTestFile }) {
  const browser = getService('browser');

  describe('console app', function () {
    this.tags('ciGroup1');

    before(async function () {
      await browser.setWindowSize(1300, 1100);
    });

    loadTestFile(require.resolve('./_console'));
  });
}
