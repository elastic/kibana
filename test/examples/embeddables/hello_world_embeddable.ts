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

  describe('hello world embeddable', () => {
    before(async () => {
      await testSubjects.click('helloWorldEmbeddableSection');
    });

    it('hello world embeddable render', async () => {
      await retry.try(async () => {
        const text = await testSubjects.getVisibleText('helloWorldEmbeddable');
        expect(text).to.be('HELLO WORLD!');
      });
    });

    it('hello world embeddable from factory renders', async () => {
      await retry.try(async () => {
        const text = await testSubjects.getVisibleText('helloWorldEmbeddableFromFactory');
        expect(text).to.be('HELLO WORLD!');
      });
    });
  });
}
