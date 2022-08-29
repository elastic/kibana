/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export default function ({ getService, loadTestFile }) {
  const browser = getService('browser');
  const config = getService('config');

  describe('console app', function () {
    before(async function () {
      await browser.setWindowSize(1300, 1100);
    });
    if (config.get('esTestCluster.ccs')) {
      loadTestFile(require.resolve('./_console_ccs'));
    } else {
      loadTestFile(require.resolve('./_console'));
      loadTestFile(require.resolve('./_autocomplete'));
      loadTestFile(require.resolve('./_vector_tile'));
      loadTestFile(require.resolve('./_comments'));
      loadTestFile(require.resolve('./_variables'));
      loadTestFile(require.resolve('./_xjson'));
    }
  });
}
