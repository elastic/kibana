/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export default function ({ getService, loadTestFile }) {
  const browser = getService('browser');

  describe('Getting Started ', function () {
    this.tags(['ciGroup6']);

    before(async function () {
      await browser.setWindowSize(1200, 800);
    });
    // https://www.elastic.co/guide/en/kibana/current/tutorial-load-dataset.html
    loadTestFile(require.resolve('./_shakespeare'));
  });
}
