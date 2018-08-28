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

import sinon from 'sinon';
import expect from 'expect.js';
import { delay } from 'bluebird';

import { createPromiseFromStreams } from '../promise_from_streams';
import { createListStream } from '../list_stream';
import { createMapStream } from '../map_stream';
import { createConcatStream } from '../concat_stream';

describe('createMapStream()', () => {
  it('calls the function with each item in the source stream', async () => {
    const mapper = sinon.stub();

    await createPromiseFromStreams([
      createListStream([ 'a', 'b', 'c' ]),
      createMapStream(mapper),
    ]);

    sinon.assert.calledThrice(mapper);
    sinon.assert.calledWith(mapper, 'a', 0);
    sinon.assert.calledWith(mapper, 'b', 1);
    sinon.assert.calledWith(mapper, 'c', 2);
  });

  it('send the return value from the mapper on the output stream', async () => {
    const result = await createPromiseFromStreams([
      createListStream([ 1, 2, 3 ]),
      createMapStream(n => n * 100),
      createConcatStream([])
    ]);

    expect(result).to.eql([100, 200, 300]);
  });

  it('supports async mappers', async () => {
    const result = await createPromiseFromStreams([
      createListStream([ 1, 2, 3 ]),
      createMapStream(async (n, i) => {
        await delay(n);
        return n * i;
      }),
      createConcatStream([])
    ]);

    expect(result).to.eql([ 0, 2, 6]);
  });
});
