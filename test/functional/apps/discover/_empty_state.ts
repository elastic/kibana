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
  const testSubjects = getService('testSubjects');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['common', 'timePicker', 'discover']);

  describe('empty state', () => {
    before(async () => {
      await kibanaServer.uiSettings.unset('defaultIndex');
      await kibanaServer.savedObjects.clean({ types: ['search', 'index-pattern'] });
    });

    it('redirects to Overview app', async () => {
      await PageObjects.common.navigateToApp('discover');
      const selector = await testSubjects.find('kibanaChrome');
      const content = await selector.findByCssSelector('.kbnNoDataPageContents');
      expect(content).not.to.be(null);
    });
  });
}
