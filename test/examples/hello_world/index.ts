/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../functional/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getService, getPageObjects, loadTestFile }: FtrProviderContext) {
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common']);

  describe('Hello world', function () {
    before(async () => {
      this.tags('ciGroup2');
      await PageObjects.common.navigateToApp('helloWorld');
    });

    it('renders hello world text', async () => {
      await retry.try(async () => {
        const message = await testSubjects.getVisibleText('helloWorldDiv');
        expect(message).to.be('Hello World!');
      });
    });
  });
}
