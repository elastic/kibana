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

import { createListStream } from '../';

describe('listStream', () => {
  it('provides the values in the initial list', async () => {
    const str = createListStream([1, 2, 3, 4]);
    const stub = sinon.stub();
    str.on('data', stub);

    await new Promise(resolve => str.on('end', resolve));

    sinon.assert.callCount(stub, 4);
    expect(stub.getCall(0).args).to.eql([1]);
    expect(stub.getCall(1).args).to.eql([2]);
    expect(stub.getCall(2).args).to.eql([3]);
    expect(stub.getCall(3).args).to.eql([4]);
  });

  it('does not modify the list passed', async () => {
    const list = [1, 2, 3, 4];
    const str = createListStream(list);
    str.resume();
    await new Promise(resolve => str.on('end', resolve));
    expect(list).to.eql([1, 2, 3, 4]);
  });
});
