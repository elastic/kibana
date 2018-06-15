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

import { getFlattenedObject } from '../get_flattened_object';

describe('getFlattenedObject()', () => {
  it('throws when rootValue is not an object or is an array', () => {
    expect(() => getFlattenedObject(1)).to.throwError('number');
    expect(() => getFlattenedObject(Infinity)).to.throwError('number');
    expect(() => getFlattenedObject(NaN)).to.throwError('number');
    expect(() => getFlattenedObject(false)).to.throwError('boolean');
    expect(() => getFlattenedObject(null)).to.throwError('null');
    expect(() => getFlattenedObject(undefined)).to.throwError('undefined');
    expect(() => getFlattenedObject([])).to.throwError('array');
  });

  it('flattens objects', () => {
    expect(getFlattenedObject({ a: 'b' })).to.eql({ a: 'b' });
    expect(getFlattenedObject({ a: { b: 'c' } })).to.eql({ 'a.b': 'c' });
    expect(getFlattenedObject({ a: { b: 'c' }, d: { e: 'f' } })).to.eql({ 'a.b': 'c', 'd.e': 'f' });
  });

  it('does not flatten arrays', () => {
    expect(getFlattenedObject({ a: ['b'] })).to.eql({ a: ['b'] });
    expect(getFlattenedObject({ a: { b: ['c', 'd'] } })).to.eql({ 'a.b': ['c', 'd'] });
  });
});
