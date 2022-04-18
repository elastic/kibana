/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginFunctionalProviderContext } from '../../plugin_functional/services';

// eslint-disable-next-line import/no-default-export
export default function ({
  getService,
  getPageObjects,
  loadTestFile,
}: PluginFunctionalProviderContext) {
  const esArchiver = getService('esArchiver');
  const browser = getService('browser');
  const es = getService('es');
  const PageObjects = getPageObjects(['common', 'header', 'settings']);

  describe('data view field editor example', function () {
    this.tags('ciGroup2');
    before(async () => {
      await esArchiver.emptyKibanaIndex();
      await browser.setWindowSize(1300, 900);
      await es.transport.request({
        path: '/blogs/_doc',
        method: 'POST',
        body: { user: 'matt', message: 20 },
      });

      await PageObjects.settings.navigateTo();
      await PageObjects.settings.createIndexPattern('blogs', null);
      await PageObjects.common.navigateToApp('dataViewFieldEditorExample');
    });

    loadTestFile(require.resolve('./data_view_field_editor_example'));
  });
}
