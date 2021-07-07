/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { PluginFunctionalProviderContext } from '../../services';
import '../../../../test/plugin_functional/plugins/core_provider_plugin/types';

export default function ({ getService, getPageObjects }: PluginFunctionalProviderContext) {
  describe('execution context', function () {
    describe('passed for a client-side operation', () => {
      const PageObjects = getPageObjects(['common']);
      const browser = getService('browser');

      before(async () => {
        await PageObjects.common.navigateToApp('home');
      });

      it('passes plugin-specific execution context to Elasticsearch server', async () => {
        expect(
          await browser.execute(async () => {
            const coreStart = window._coreProvider.start.core;

            const context = coreStart.executionContext.create({
              type: 'execution_context_app',
              name: 'Execution context app',
              id: '42',
              // add a non-ASCII symbols to make sure it doesn't break the context propagation mechanism
              description: 'какое-то странное описание',
            });

            const result = await coreStart.http.get('/execution_context/pass', {
              context,
            });

            return result['x-opaque-id'];
          })
        ).to.contain('kibana:execution_context_app:42');
      });
    });
  });
}
