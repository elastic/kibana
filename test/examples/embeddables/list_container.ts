/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { PluginFunctionalProviderContext } from '../../plugin_functional/services';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: PluginFunctionalProviderContext) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  describe('list container', () => {
    before(async () => {
      await testSubjects.click('listContainerSection');
    });

    it('list containers render', async () => {
      await retry.try(async () => {
        const title = await testSubjects.getVisibleText('listContainerTitle');
        expect(title).to.be('Hello world list');

        const text = await testSubjects.getVisibleTextAll('helloWorldEmbeddable');
        expect(text).to.eql(['HELLO WORLD!', 'HELLO WORLD!']);
      });
    });
  });
}
