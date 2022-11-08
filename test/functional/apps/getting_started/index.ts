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
  const kibanaServer = getService('kibanaServer');
  const config = getService('config');
  const esNode = config.get('esTestCluster.ccs')
    ? getService('remoteEsArchiver' as 'esArchiver')
    : getService('esArchiver');

  describe('Getting Started ', function () {
    before(async function () {
      await browser.setWindowSize(1200, 800);
      await esNode.loadIfNeeded('test/functional/fixtures/es_archiver/getting_started/shakespeare');
    });

    after(async function () {
      await esNode.unload('test/functional/fixtures/es_archiver/getting_started/shakespeare');
    });

    // TODO: Remove when vislib is removed
    describe('old charts library', function () {
      before(async () => {
        await kibanaServer.uiSettings.update({
          'visualization:visualize:legacyPieChartsLibrary': true,
        });
        await browser.refresh();
      });

      after(async () => {
        await kibanaServer.uiSettings.update({
          'visualization:visualize:legacyPieChartsLibrary': false,
        });
        await browser.refresh();
      });

      loadTestFile(require.resolve('./_shakespeare'));
    });

    describe('new charts library', () => {
      loadTestFile(require.resolve('./_shakespeare'));
    });
  });
}
