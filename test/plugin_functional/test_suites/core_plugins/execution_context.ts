/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { PluginFunctionalProviderContext } from '../../services';
import '@kbn/core-provider-plugin/types';

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

            const context = {
              type: 'visualization',
              name: 'execution_context_app',
              // add a non-ASCII symbols to make sure it doesn't break the context propagation mechanism
              id: 'Visualization☺漢字',
              description: 'какое-то странное описание',
            };

            const result = await coreStart.http.get<{ ['x-opaque-id']: string }>(
              '/execution_context/pass',
              { context }
            );

            return result['x-opaque-id'];
          })
        ).to.contain(
          'kibana:visualization:execution_context_app:Visualization%E2%98%BA%E6%BC%A2%E5%AD%97'
        );
      });
    });
  });
}
