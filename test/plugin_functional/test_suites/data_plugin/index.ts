/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginFunctionalProviderContext } from '../../services';

export default function ({
  getPageObjects,
  getService,
  loadTestFile,
}: PluginFunctionalProviderContext) {
  const esArchiver = getService('esArchiver');
  const PageObjects = getPageObjects(['common', 'header', 'settings']);

  describe('data plugin', () => {
    before(async () => {
      await esArchiver.loadIfNeeded(
        'test/functional/fixtures/es_archiver/getting_started/shakespeare'
      );
      await PageObjects.common.navigateToApp('settings');
      await PageObjects.settings.createIndexPattern('shakespeare', '');
    });

    loadTestFile(require.resolve('./search'));
    loadTestFile(require.resolve('./session'));
    loadTestFile(require.resolve('./index_patterns'));
  });
}
