/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { deepFreeze } from './deep_freeze';

test(`freezes result and input`, () => {
  const input = {};
  const result = deepFreeze(input);

  Object.isFrozen(input);
  Object.isFrozen(result);
});

test(`freezes top-level properties that are objects`, () => {
  const result = deepFreeze({
    object: {},
    array: [],
    fn: () => {},
    number: 1,
    string: '',
  });

  Object.isFrozen(result.object);
  Object.isFrozen(result.array);
  Object.isFrozen(result.fn);
  Object.isFrozen(result.number);
  Object.isFrozen(result.string);
});

test(`freezes child properties that are objects`, () => {
  const result = deepFreeze({
    object: {
      object: {},
      array: [],
      fn: () => {},
      number: 1,
      string: '',
    },
    array: [{}, [], () => {}, 1, ''],
  });

  Object.isFrozen(result.object.object);
  Object.isFrozen(result.object.array);
  Object.isFrozen(result.object.fn);
  Object.isFrozen(result.object.number);
  Object.isFrozen(result.object.string);
  Object.isFrozen(result.array[0]);
  Object.isFrozen(result.array[1]);
  Object.isFrozen(result.array[2]);
  Object.isFrozen(result.array[3]);
  Object.isFrozen(result.array[4]);
});

test(`freezes grand-child properties that are objects`, () => {
  const result = deepFreeze({
    object: {
      object: {
        object: {},
        array: [],
        fn: () => {},
        number: 1,
        string: '',
      },
    },
    array: [[{}, [], () => {}, 1, '']],
  });

  Object.isFrozen(result.object.object.object);
  Object.isFrozen(result.object.object.array);
  Object.isFrozen(result.object.object.fn);
  Object.isFrozen(result.object.object.number);
  Object.isFrozen(result.object.object.string);
  Object.isFrozen(result.array[0][0]);
  Object.isFrozen(result.array[0][1]);
  Object.isFrozen(result.array[0][2]);
  Object.isFrozen(result.array[0][3]);
  Object.isFrozen(result.array[0][4]);
});
