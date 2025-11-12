/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginFunctionalProviderContext } from 'test/plugin_functional/services';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: PluginFunctionalProviderContext) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  describe('index pattern field editor example', () => {
    it.skip('finds an index pattern', async () => {
      await retry.try(async () => {
        await testSubjects.existOrFail('indexPatternTitle');
      });
    });
    it.skip('opens the field editor', async () => {
      await testSubjects.click('addField');
      await retry.try(async () => {
        await testSubjects.existOrFail('flyoutTitle');
      });
    });
  });
}
