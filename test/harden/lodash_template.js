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
const _ = require('lodash');
const template = require('lodash/template');
const fp = require('lodash/fp');
const fpTemplate = require('lodash/fp/template');
const test = require('tape');

Object.prototype.sourceURL = '\u2028\u2029\n;global.whoops=true'; // eslint-disable-line no-extend-native

test.onFinish(() => {
  delete Object.prototype.sourceURL;
});

test('test setup ok', (t) => {
  t.equal({}.sourceURL, '\u2028\u2029\n;global.whoops=true');
  t.end();
});

[_.template, template].forEach((fn) => {
  test(`_.template('<%= foo %>')`, (t) => {
    const output = fn('<%= foo %>')({ foo: 'bar' });
    t.equal(output, 'bar');
    t.equal(global.whoops, undefined);
    t.end();
  });

  test(`_.template('<%= foo %>', {})`, (t) => {
    const output = fn('<%= foo %>', Object.freeze({}))({ foo: 'bar' });
    t.equal(output, 'bar');
    t.equal(global.whoops, undefined);
    t.end();
  });

  test(`_.template('<%= data.foo %>', { variable: 'data' })`, (t) => {
    const output = fn('<%= data.foo %>', Object.freeze({ variable: 'data' }))({ foo: 'bar' });
    t.equal(output, 'bar');
    t.equal(global.whoops, undefined);
    t.end();
  });

  test(`_.template('<%= foo %>', { sourceURL: '/foo/bar' })`, (t) => {
    // throwing errors in the template and parsing the stack, which is a string, is super ugly, but all I know to do
    const template = fn('<% throw new Error() %>', Object.freeze({ sourceURL: '/foo/bar' }));
    t.plan(2);
    try {
      template();
    } catch (err) {
      const path = parsePathFromStack(err.stack);
      t.equal(path, '/foo/bar');
      t.equal(global.whoops, undefined);
    }
  });

  test(`_.template('<%= foo %>', { sourceURL: '\\u2028\\u2029\\nglobal.whoops=true' })`, (t) => {
    // throwing errors in the template and parsing the stack, which is a string, is super ugly, but all I know to do
    const template = fn(
      '<% throw new Error() %>',
      Object.freeze({ sourceURL: '\u2028\u2029\nglobal.whoops=true' })
    );
    t.plan(2);
    try {
      template();
    } catch (err) {
      const path = parsePathFromStack(err.stack);
      t.equal(path, 'global.whoops=true');
      t.equal(global.whoops, undefined);
    }
  });

  test(`_.template used as an iteratee call(`, (t) => {
    const templateStrArr = ['<%= data.foo %>', 'example <%= data.foo %>'];
    const output = _.map(templateStrArr, fn);

    t.equal(output[0]({ data: { foo: 'bar' } }), 'bar');
    t.equal(output[1]({ data: { foo: 'bar' } }), 'example bar');
    t.equal(global.whoops, undefined);
    t.end();
  });
});

[fp.template, fpTemplate].forEach((fn) => {
  test(`fp.template('<%= foo %>')`, (t) => {
    const output = fn('<%= foo %>')({ foo: 'bar' });
    t.equal(output, 'bar');
    t.equal(global.whoops, undefined);
    t.end();
  });

  test(`fp.template('<%= foo %>', {})`, (t) => {
    // fp.template ignores the second argument, this is negligible in this situation since options is an empty object
    const output = fn('<%= foo %>', Object.freeze({}))({ foo: 'bar' });
    t.equal(output, 'bar');
    t.equal(global.whoops, undefined);
    t.end();
  });

  test(`fp.template('<%= data.foo %>', { variable: 'data' })`, (t) => {
    // fp.template ignores the second argument, this causes an error to be thrown
    t.plan(2);
    try {
      fn('<%= data.foo %>', Object.freeze({ variable: 'data' }))({ foo: 'bar' });
    } catch (err) {
      t.equal(err.message, 'data is not defined');
      t.equal(global.whoops, undefined);
    }
  });

  test(`fp.template('<%= foo %>', { sourceURL: '/foo/bar' })`, (t) => {
    // fp.template ignores the second argument, the sourceURL is ignored
    // throwing errors in the template and parsing the stack, which is a string, is super ugly, but all I know to do
    // our patching to hard-code the sourceURL and use non-FP _.template does slightly alter the stack-traces but it's negligible
    const template = fn('<% throw new Error() %>', Object.freeze({ sourceURL: '/foo/bar' }));
    t.plan(3);
    try {
      template();
    } catch (err) {
      const path = parsePathFromStack(err.stack);
      t.match(path, /^eval at <anonymous> /);
      t.doesNotMatch(path, /\/foo\/bar/);
      t.equal(global.whoops, undefined);
    }
  });

  test(`fp.template('<%= foo %>', { sourceURL: '\\u2028\\u2029\\nglobal.whoops=true' })`, (t) => {
    // fp.template ignores the second argument, the sourceURL is ignored
    // throwing errors in the template and parsing the stack, which is a string, is super ugly, but all I know to do
    // our patching to hard-code the sourceURL and use non-FP _.template does slightly alter the stack-traces but it's negligible
    const template = fn(
      '<% throw new Error() %>',
      Object.freeze({ sourceURL: '\u2028\u2029\nglobal.whoops=true' })
    );
    t.plan(3);
    try {
      template();
    } catch (err) {
      const path = parsePathFromStack(err.stack);
      t.match(path, /^eval at <anonymous> /);
      t.doesNotMatch(path, /\/foo\/bar/);
      t.equal(global.whoops, undefined);
    }
  });

  test(`fp.template used as an iteratee call(`, (t) => {
    const templateStrArr = ['<%= data.foo %>', 'example <%= data.foo %>'];
    const output = fp.map(fn)(templateStrArr);

    t.equal(output[0]({ data: { foo: 'bar' } }), 'bar');
    t.equal(output[1]({ data: { foo: 'bar' } }), 'example bar');
    t.equal(global.whoops, undefined);
    t.end();
  });
});

function parsePathFromStack(stack) {
  const lines = stack.split('\n');
  // the frame starts at the second line
  const frame = lines[1];

  // the path is in parathensis, and ends with a colon before the line/column numbers
  const [, path] = /\(([^:]+)/.exec(frame);
  return path;
}
