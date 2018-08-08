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
import sinon from 'sinon';

import {
  createPromiseFromStreams,
  createListStream,
  createIntersperseStream,
  createConcatStream
} from '../';

describe('intersperseStream', () => {
  it('places the intersperse value between each provided value', async () => {
    expect(
      await createPromiseFromStreams([
        createListStream(['to', 'be', 'or', 'not', 'to', 'be']),
        createIntersperseStream(' '),
        createConcatStream()
      ])
    ).to.be('to be or not to be');
  });

  it('emits values as soon as possible, does not needlessly buffer', async () => {
    const str = createIntersperseStream('y');
    const stub = sinon.stub();
    str.on('data', stub);

    str.write('a');
    sinon.assert.calledOnce(stub);
    expect(stub.firstCall.args).to.eql(['a']);
    stub.resetHistory();

    str.write('b');
    sinon.assert.calledTwice(stub);
    expect(stub.firstCall.args).to.eql(['y']);
    sinon.assert.calledTwice(stub);
    expect(stub.secondCall.args).to.eql(['b']);
  });
});
