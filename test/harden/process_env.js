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

require('../../src/setup_node_env');

const test = require('tape');
const { ObjectPrototype } = require('object-prototype');

test('process.env prototype', t => {
  t.equal(Object.prototype.isPrototypeOf(process.env), false);
  t.equal(ObjectPrototype.isPrototypeOf(process.env), true);
  t.end();
});

test('prototype pollution', t => {
  Object.prototype.foo = 42; // eslint-disable-line no-extend-native
  t.equal(process.env.foo, undefined);
  delete Object.prototype.foo;
  t.end();
});

test('Object.prototype functions', t => {
  t.equal(typeof process.env.hasOwnProperty, 'function');
  t.equal(process.env.hasOwnProperty('HOME'), true);
  t.end();
});
