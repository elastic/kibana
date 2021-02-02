/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, loadTestFile }: FtrProviderContext) {
  const browser = getService('browser');
  const kibanaServer = getService('kibanaServer');

  describe('Getting Started ', function () {
    this.tags(['ciGroup6']);

    before(async function () {
      await browser.setWindowSize(1200, 800);
    });

    // TODO: Remove when vislib is removed
    describe('new charts library', function () {
      before(async () => {
        await kibanaServer.uiSettings.update({
          'visualization:visualize:legacyChartsLibrary': false,
        });
        await browser.refresh();
      });

      after(async () => {
        await kibanaServer.uiSettings.update({
          'visualization:visualize:legacyChartsLibrary': true,
        });
        await browser.refresh();
      });

      loadTestFile(require.resolve('./_shakespeare'));
    });

    describe('', () => {
      loadTestFile(require.resolve('./_shakespeare'));
    });
  });
}
