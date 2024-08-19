/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

require('../../src/setup_node_env');

const test = require('tape');

test('Prevents new properties from being added to the prototype', (t) => {
  Object.prototype.test = 'whoops'; // eslint-disable-line no-extend-native
  t.equal({}.test, undefined);
  t.end();
});

test('Permits overriding Object.prototype.toString', (t) => {
  let originalToString;
  t.test('setup', (t) => {
    originalToString = Object.prototype.toString;
    t.end();
  });

  t.test('test', (t) => {
    // Assert native toString behavior
    t.equal({}.toString(), '[object Object]');

    const {
      writable: originalWritable,
      enumerable: originalEnumerable,
      configurable: originalConfigurable,
    } = Object.getOwnPropertyDescriptor(Object.prototype, 'toString');

    // eslint-disable-next-line no-extend-native
    Object.prototype.toString = function toString() {
      return 'my new toString function';
    };
    t.equal({}.toString(), 'my new toString function');

    const toStringDescriptor = Object.getOwnPropertyDescriptor(Object.prototype, 'toString');

    // Overwriting a property should not change its descriptor.
    t.equal(toStringDescriptor.writable, originalWritable);
    t.equal(toStringDescriptor.enumerable, originalEnumerable);
    t.equal(toStringDescriptor.configurable, originalConfigurable);

    t.end();
  });

  t.test('teardown', (t) => {
    // eslint-disable-next-line no-extend-native
    Object.prototype.toString = originalToString;
    t.end();
  });
});
