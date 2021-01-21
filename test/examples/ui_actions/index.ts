/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { PluginFunctionalProviderContext } from 'test/plugin_functional/services';

// eslint-disable-next-line import/no-default-export
export default function ({
  getService,
  getPageObjects,
  loadTestFile,
}: PluginFunctionalProviderContext) {
  const browser = getService('browser');
  const PageObjects = getPageObjects(['common', 'header']);

  describe('ui actions explorer', function () {
    before(async () => {
      await browser.setWindowSize(1300, 900);
      await PageObjects.common.navigateToApp('uiActionsExplorer');
    });

    loadTestFile(require.resolve('./ui_actions'));
  });
}
