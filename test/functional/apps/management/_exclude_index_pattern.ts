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

  describe('creating and deleting default index', function describeIndexTests() {
    it('data view creation with exclusion', async () => {
      await es.transport.request({
        path: '/index-a/_doc',
        method: 'POST',
        body: { user: 'matt' },
      });

      await es.transport.request({
        path: '/index-b/_doc',
        method: 'POST',
        body: { title: 'hello' },
      });

      await PageObjects.settings.createIndexPattern('index-*,-index-b');

      const fieldCount = await PageObjects.settings.getFieldsTabCount();

      // five metafields plus keyword and text version of 'user' field
      expect(parseInt(fieldCount, 10)).to.be(7);
    });
  });
}
