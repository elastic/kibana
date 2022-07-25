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

  describe('', () => {
    it('hello world action', async () => {
      await testSubjects.click('emitHelloWorldTrigger');
      await retry.try(async () => {
        const text = await testSubjects.getVisibleText('helloWorldActionText');
        expect(text).to.be('Hello world!');
      });

      await testSubjects.click('closeModal');
    });

    it('dynamic hello world action', async () => {
      await testSubjects.click('addDynamicAction');
      await retry.try(async () => {
        await testSubjects.click('emitHelloWorldTrigger');
        await testSubjects.click('embeddablePanelAction-ACTION_HELLO_WORLD-Waldo');
      });
      await retry.try(async () => {
        const text = await testSubjects.getVisibleText('dynamicHelloWorldActionText');
        expect(text).to.be('Hello Waldo');
      });
      await testSubjects.click('closeModal');
    });
  });
}
