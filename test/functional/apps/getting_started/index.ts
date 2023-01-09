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

    describe('new charts library', () => {
      loadTestFile(require.resolve('./_shakespeare'));
    });
  });
}
