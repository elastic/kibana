/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { PluginFunctionalProviderContext } from '../../services';

export default function ({ getPageObjects }: PluginFunctionalProviderContext) {
  const PageObjects = getPageObjects(['common']);

  describe('EUI Provider Dev Warning', () => {
    it('cause test failure if found with navigateToApp', async () => {
      let thrown = false;
      try {
        await PageObjects.common.navigateToApp('euiProviderDevWarning');
      } catch (err) {
        expect(err.toString()).contain('EuiProvider Warning Toast detected');
        thrown = true;
      }
      expect(thrown).equal(true);
    });
  });
}
