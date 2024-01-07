/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['settings', 'common', 'header']);
  const find = getService('find');

  describe('Data view field caps cache advanced setting', async function () {
    before(async () => {
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaSettings();
    });
    it('should have cache setting', async () => {
      const cacheSetting = await find.byCssSelector('#data_views\\:cache_max_age-group');
      expect(cacheSetting).to.not.be(undefined);
    });
  });
}
