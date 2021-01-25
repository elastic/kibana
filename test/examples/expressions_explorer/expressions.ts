/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import expect from '@kbn/expect';

import { PluginFunctionalProviderContext } from 'test/plugin_functional/services';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: PluginFunctionalProviderContext) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const browser = getService('browser');

  describe('', () => {
    it('runs expression', async () => {
      await retry.try(async () => {
        const text = await testSubjects.getVisibleText('expressionResult');
        expect(text).to.be(
          '{\n "type": "error",\n "error": {\n  "message": "Function markdown could not be found.",\n  "name": "fn not found"\n }\n}'
        );
      });
    });

    it('renders expression', async () => {
      await retry.try(async () => {
        const text = await testSubjects.getVisibleText('expressionRender');
        expect(text).to.be('Function markdown could not be found.');
      });
    });

    it('emits an action and navigates', async () => {
      await testSubjects.click('testExpressionButton');
      await retry.try(async () => {
        const text = await browser.getCurrentUrl();
        expect(text).to.be('https://www.google.com/?gws_rd=ssl');
      });
    });
  });
}
