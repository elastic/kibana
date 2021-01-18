/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
