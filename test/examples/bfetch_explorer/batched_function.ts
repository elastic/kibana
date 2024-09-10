/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
