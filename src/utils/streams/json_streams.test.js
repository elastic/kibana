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

import {
  createPromiseFromStreams,
  createListStream,
  createConcatStream,
  createJsonParseStream,
  createJsonStringifyStream
} from './';

function createCircularStructure() {
  const obj = {};
  obj.obj = obj; // create circular reference
  return obj;
}

describe('jsonParseStream', () => {
  describe('standard usage', () => {
    test('parses json strings', async () => {
      const str = createJsonParseStream();
      const dataPromise = new Promise((resolve, reject) => {
        str.on('data', resolve);
        str.on('error', reject);
      });
      str.write('{ "foo": "bar" }');

      expect(await dataPromise).toEqual({
        foo: 'bar'
      });
    });

    test('parses json value passed to it from a list stream', async () => {
      expect(await createPromiseFromStreams([
        createListStream([
          '"foo"',
          '1'
        ]),
        createJsonParseStream(),
        createConcatStream([])
      ]))
        .toEqual(['foo', 1]);
    });
  });

  describe('error handling', () => {
    test('emits an error when there is a parse failure', async () => {
      const str = createJsonParseStream();
      const errorPromise = new Promise(resolve => str.once('error', resolve));
      str.write('{"partial');
      const err = await errorPromise;
      expect(err).toBeInstanceOf(Error);
      expect(err).toHaveProperty('name', 'SyntaxError');
    });

    test('continues parsing after an error', async () => {
      const str = createJsonParseStream();

      const firstEmitPromise = new Promise(resolve => {
        str.once('error', v => resolve({ name: 'error', value: v }));
        str.once('data', v => resolve({ name: 'data', value: v }));
      });

      str.write('{"partial');
      const firstEmit = await firstEmitPromise;
      expect(firstEmit).toHaveProperty('name', 'error');
      expect(firstEmit.value).toBeInstanceOf(Error);

      const secondEmitPromise = new Promise(resolve => {
        str.once('error', v => resolve({ name: 'error', value: v }));
        str.once('data', v => resolve({ name: 'data', value: v }));
      });

      str.write('42');
      const secondEmit = await secondEmitPromise;
      expect(secondEmit).toHaveProperty('name', 'data');
      expect(secondEmit).toHaveProperty('value', 42);
    });
  });
});

describe('jsonStringifyStream', () => {
  describe('standard usage', () => {
    test('stringifys js values', async () => {
      const str = createJsonStringifyStream();
      const dataPromise = new Promise((resolve, reject) => {
        str.on('data', resolve);
        str.on('error', reject);
      });
      str.write({ foo: 'bar' });

      expect(await dataPromise).toBe('{"foo":"bar"}');
    });

    test('stringifys js values passed from a list stream', async () => {
      const all = await createPromiseFromStreams([
        createListStream([
          'foo',
          1
        ]),
        createJsonStringifyStream(),
        createConcatStream([])
      ]);

      expect(all).toEqual(['"foo"', '1']);
    });
  });

  describe('error handling', () => {
    test('emits an error when there is a parse failure', async () => {
      const str = createJsonStringifyStream();
      const errorPromise = new Promise(resolve => str.once('error', resolve));
      str.write(createCircularStructure());
      const err = await errorPromise;
      expect(err).toBeInstanceOf(Error);
      expect(err).toHaveProperty('name', 'TypeError');
      expect(err.message).toContain('circular');
    });

    test('continues parsing after an error', async () => {
      const str = createJsonStringifyStream();

      const firstEmitPromise = new Promise(resolve => {
        str.once('error', v => resolve({ name: 'error', value: v }));
        str.once('data', v => resolve({ name: 'data', value: v }));
      });

      str.write(createCircularStructure());

      const firstEmit = await firstEmitPromise;
      expect(firstEmit).toHaveProperty('name', 'error');
      expect(firstEmit.value).toBeInstanceOf(Error);

      const secondEmitPromise = new Promise(resolve => {
        str.once('error', v => resolve({ name: 'error', value: v }));
        str.once('data', v => resolve({ name: 'data', value: v }));
      });

      str.write('foo');
      const secondEmit = await secondEmitPromise;
      expect(secondEmit).toHaveProperty('name', 'data');
      expect(secondEmit).toHaveProperty('value', '"foo"');
    });
  });
});
