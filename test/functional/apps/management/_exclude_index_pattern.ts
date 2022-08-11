/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['settings']);
  const es = getService('es');
  const security = getService('security');

  describe('creating and deleting default index', function describeIndexTests() {
    before(async function () {
      await security.testUser.setRoles(['kibana_admin', 'index_a', 'index_b']);
      await PageObjects.settings.navigateTo();
      await es.transport.request({
        path: '/index_a/_doc',
        method: 'POST',
        body: { user: 'matt' },
      });

      await es.transport.request({
        path: '/index_b/_doc',
        method: 'POST',
        body: { title: 'hello' },
      });
      await PageObjects.settings.createIndexPattern('index_*,-index_b');
    });

    it('data view creation with exclusion', async () => {
      const fieldCount = await PageObjects.settings.getFieldsTabCount();
      // five metafields plus keyword and text version of 'user' field
      expect(parseInt(fieldCount, 10)).to.be(6);
    });

    after(async () => {
      await es.transport.request({
        path: '/index_a',
        method: 'DELETE',
      });
      await es.transport.request({
        path: '/index_b',
        method: 'DELETE',
      });
      await PageObjects.settings.removeIndexPattern();
      await security.testUser.restoreDefaults();
    });
  });
}
