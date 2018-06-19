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
  createPromiseFromStreams,
  createListStream,
  createConcatStream,
  createJsonParseStream
} from '../';

describe('jsonParseStream', () => {
  describe('standard usage', () => {
    it('parses json strings', async () => {
      const str = createJsonParseStream();
      const dataPromise = new Promise((resolve, reject) => {
        str.on('data', resolve);
        str.on('error', reject);
      });
      str.write('{ "foo": "bar" }');

      expect(await dataPromise).to.eql({
        foo: 'bar'
      });
    });

    it('parses json value passed to it from a list stream', async () => {
      expect(await createPromiseFromStreams([
        createListStream([
          '"foo"',
          '1'
        ]),
        createJsonParseStream(),
        createConcatStream([])
      ]))
        .to.eql(['foo', 1]);
    });
  });

  describe('error handling', () => {
    it('emits an error when there is a parse failure', async () => {
      const str = createJsonParseStream();
      const errorPromise = new Promise(resolve => str.once('error', resolve));
      str.write('{"partial');
      const err = await errorPromise;
      expect(err).to.be.an(Error);
      expect(err).to.have.property('name', 'SyntaxError');
    });

    it('continues parsing after an error', async () => {
      const str = createJsonParseStream();

      const firstEmitPromise = new Promise(resolve => {
        str.once('error', v => resolve({ name: 'error', value: v }));
        str.once('data', v => resolve({ name: 'data', value: v }));
      });

      str.write('{"partial');
      const firstEmit = await firstEmitPromise;
      expect(firstEmit).to.have.property('name', 'error');
      expect(firstEmit.value).to.be.an(Error);

      const secondEmitPromise = new Promise(resolve => {
        str.once('error', v => resolve({ name: 'error', value: v }));
        str.once('data', v => resolve({ name: 'data', value: v }));
      });

      str.write('42');
      const secondEmit = await secondEmitPromise;
      expect(secondEmit).to.have.property('name', 'data');
      expect(secondEmit).to.have.property('value', 42);
    });
  });
});
