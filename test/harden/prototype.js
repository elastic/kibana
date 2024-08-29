/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

require('../../src/setup_node_env');

const test = require('tape');

test('Object.prototype', (t) => {
  t.test('Prevents new properties from being added to the prototype', (t) => {
    Object.prototype.test = 'whoops'; // eslint-disable-line no-extend-native
    t.equal({}.test, undefined);
    t.end();
  });

  t.test('Permits overriding Object.prototype.toString', (t) => {
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
});

test('Number.prototype', (t) => {
  t.test('Prevents new properties from being added to the prototype', (t) => {
    Number.prototype.test = 'whoops'; // eslint-disable-line no-extend-native
    t.equal((12).test, undefined);
    t.end();
  });

  t.test('Permits overriding Number.prototype.toString', (t) => {
    let originalToString;
    t.test('setup', (t) => {
      originalToString = Number.prototype.toString;
      t.end();
    });

    t.test('test', (t) => {
      // Assert native toString behavior
      t.equal((1).toString(), '1');

      const {
        writable: originalWritable,
        enumerable: originalEnumerable,
        configurable: originalConfigurable,
      } = Object.getOwnPropertyDescriptor(Number.prototype, 'toString');

      // eslint-disable-next-line no-extend-native
      Number.prototype.toString = function toString() {
        return 'my new Number.toString function';
      };
      t.equal((12).toString(), 'my new Number.toString function');

      const toStringDescriptor = Object.getOwnPropertyDescriptor(Number.prototype, 'toString');

      // Overwriting a property should not change its descriptor.
      t.equal(toStringDescriptor.writable, originalWritable);
      t.equal(toStringDescriptor.enumerable, originalEnumerable);
      t.equal(toStringDescriptor.configurable, originalConfigurable);

      t.end();
    });

    t.test('teardown', (t) => {
      // eslint-disable-next-line no-extend-native
      Number.prototype.toString = originalToString;
      t.end();
    });
  });
});

test('String.prototype', (t) => {
  t.test('Prevents new properties from being added to the prototype', (t) => {
    String.prototype.test = 'whoops'; // eslint-disable-line no-extend-native
    t.equal('hello'.test, undefined);
    t.end();
  });

  t.test('Permits overriding String.prototype.toString', (t) => {
    let originalToString;
    t.test('setup', (t) => {
      originalToString = String.prototype.toString;
      t.end();
    });

    t.test('test', (t) => {
      // Assert native toString behavior
      t.equal((1).toString(), '1');

      const {
        writable: originalWritable,
        enumerable: originalEnumerable,
        configurable: originalConfigurable,
      } = Object.getOwnPropertyDescriptor(String.prototype, 'toString');

      // eslint-disable-next-line no-extend-native
      String.prototype.toString = function toString() {
        return 'my new String.toString function';
      };
      t.equal('test'.toString(), 'my new String.toString function');

      const toStringDescriptor = Object.getOwnPropertyDescriptor(String.prototype, 'toString');

      // Overwriting a property should not change its descriptor.
      t.equal(toStringDescriptor.writable, originalWritable);
      t.equal(toStringDescriptor.enumerable, originalEnumerable);
      t.equal(toStringDescriptor.configurable, originalConfigurable);

      t.end();
    });

    t.test('teardown', (t) => {
      // eslint-disable-next-line no-extend-native
      String.prototype.toString = originalToString;
      t.end();
    });
  });
});

test('Function.prototype', (t) => {
  t.test('Prevents new properties from being added to the prototype', (t) => {
    Function.prototype.test = 'whoops'; // eslint-disable-line no-extend-native
    const fn = function testFn() {};
    t.equal(fn.test, undefined);
    t.end();
  });

  t.test('Permits overriding Function.prototype.toString', (t) => {
    let originalToString;
    t.test('setup', (t) => {
      originalToString = Function.prototype.toString;
      t.end();
    });

    t.test('test', (t) => {
      // Assert native toString behavior
      const fn = function testFn() {};
      t.equal(fn.toString(), 'function testFn() {}');

      const {
        writable: originalWritable,
        enumerable: originalEnumerable,
        configurable: originalConfigurable,
      } = Object.getOwnPropertyDescriptor(Function.prototype, 'toString');

      // eslint-disable-next-line no-extend-native
      Function.prototype.toString = function toString() {
        return 'my new Function.toString function';
      };
      t.equal(fn.toString(), 'my new Function.toString function');

      const toStringDescriptor = Object.getOwnPropertyDescriptor(Function.prototype, 'toString');

      // Overwriting a property should not change its descriptor.
      t.equal(toStringDescriptor.writable, originalWritable);
      t.equal(toStringDescriptor.enumerable, originalEnumerable);
      t.equal(toStringDescriptor.configurable, originalConfigurable);

      t.end();
    });

    t.test('teardown', (t) => {
      // eslint-disable-next-line no-extend-native
      Function.prototype.toString = originalToString;
      t.end();
    });
  });
});
