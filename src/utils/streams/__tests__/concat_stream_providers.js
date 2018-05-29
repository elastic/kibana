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

import { Readable } from 'stream';

import sinon from 'sinon';
import expect from 'expect.js';

import { concatStreamProviders } from '../concat_stream_providers';
import { createListStream } from '../list_stream';
import { createConcatStream } from '../concat_stream';
import { createPromiseFromStreams } from '../promise_from_streams';

describe('concatStreamProviders() helper', () => {
  it('writes the data from an array of stream providers into a destination stream in order', async () => {
    const results = await createPromiseFromStreams([
      concatStreamProviders([
        () => createListStream([
          'foo',
          'bar'
        ]),
        () => createListStream([
          'baz',
        ]),
        () => createListStream([
          'bug',
        ]),
      ]),
      createConcatStream('')
    ]);

    expect(results).to.be('foobarbazbug');
  });

  it('emits the errors from a sub-stream to the destination', async () => {
    const dest = concatStreamProviders([
      () => createListStream([
        'foo',
        'bar'
      ]),
      () => new Readable({
        read() {
          this.emit('error', new Error('foo'));
        }
      }),
    ]);

    const errorListener = sinon.stub();
    dest.on('error', errorListener);

    try {
      await createPromiseFromStreams([dest]);
      throw new Error('Expected createPromiseFromStreams() to reject with error');
    } catch (error) {
      expect(error).to.have.property('message', 'foo');
    }

    sinon.assert.calledOnce(errorListener);
    sinon.assert.calledWithExactly(errorListener, sinon.match({
      message: 'foo'
    }));
  });
});
