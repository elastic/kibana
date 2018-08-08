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

import expect from 'expect.js';

import {
  createListStream,
  createPromiseFromStreams,
  createConcatStream
} from '../';

describe('concatStream', () => {
  it('accepts an initial value', async () => {
    const output = await createPromiseFromStreams([
      createListStream([1, 2, 3]),
      createConcatStream([0])
    ]);

    expect(output).to.eql([0, 1, 2, 3]);
  });

  describe(`combines using the previous value's concat method`, () => {
    it('works with strings', async () => {
      const output = await createPromiseFromStreams([
        createListStream([
          'a',
          'b',
          'c'
        ]),
        createConcatStream()
      ]);
      expect(output).to.eql('abc');
    });

    it('works with arrays', async () => {
      const output = await createPromiseFromStreams([
        createListStream([
          [1],
          [2, 3, 4],
          [10]
        ]),
        createConcatStream()
      ]);
      expect(output).to.eql([1, 2, 3, 4, 10]);
    });

    it('works with a mixture, starting with array', async () => {
      const output = await createPromiseFromStreams([
        createListStream([
          [],
          1,
          2,
          3,
          4,
          [5, 6, 7]
        ]),
        createConcatStream()
      ]);
      expect(output).to.eql([1, 2, 3, 4, 5, 6, 7]);
    });

    it('fails when the value does not have a concat method', async () => {
      let promise;
      try {
        promise = createPromiseFromStreams([
          createListStream([1, '1']),
          createConcatStream()
        ]);
      } catch (err) {
        expect.fail('createPromiseFromStreams() should not fail synchronously');
      }

      try {
        await promise;
        expect.fail('Promise should have rejected');
      } catch (err) {
        expect(err).to.be.an(Error);
        expect(err.message).to.contain('concat');
      }
    });
  });
});
