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
import { FtrProviderContext } from '../../functional/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');

  describe('batchedFunction', () => {
    beforeEach(async () => {
      await testSubjects.click('count-until');
      await testSubjects.click('double-integers');
    });

    it('executes all requests in a batch', async () => {
      const form = await testSubjects.find('DoubleIntegers');
      const btn = await form.findByCssSelector('button');
      await btn.click();
      await new Promise((r) => setTimeout(r, 4000));
      const pre = await form.findByCssSelector('pre');
      const text = await pre.getVisibleText();
      const json = JSON.parse(text);

      expect(json).to.eql([
        {
          num: -1,
          error: {
            message: 'Invalid number',
          },
        },
        {
          num: 300,
          result: {
            num: 600,
          },
        },
        {
          num: 1000,
          result: {
            num: 2000,
          },
        },
        {
          num: 2000,
          result: {
            num: 4000,
          },
        },
      ]);
    });

    it('streams results back', async () => {
      const form = await testSubjects.find('DoubleIntegers');
      const btn = await form.findByCssSelector('button');
      await btn.click();

      await new Promise((r) => setTimeout(r, 500));
      const pre = await form.findByCssSelector('pre');

      const text1 = await pre.getVisibleText();
      const json1 = JSON.parse(text1);

      expect(json1.length > 0).to.be(true);
      expect(json1.length < 4).to.be(true);

      await new Promise((r) => setTimeout(r, 3500));

      const text2 = await pre.getVisibleText();
      const json2 = JSON.parse(text2);

      expect(json2.length).to.be(4);
    });
  });
}
