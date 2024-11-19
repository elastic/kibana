/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { showResult } from './show_result';

describe('showResult', () => {
  test('it returns true when `incompatible` is defined, and `indicesChecked` equals `indices`', () => {
    const incompatible = 0; // none of the indices checked had incompatible fields
    const indicesChecked = 2; // all indices were checked
    const indices = 2; // total indices

    expect(
      showResult({
        incompatible,
        indices,
        indicesChecked,
      })
    ).toBe(true);
  });

  test('it returns false when `incompatible` is defined, and `indices` does NOT equal `indicesChecked`', () => {
    const incompatible = 0; // the one index checked (so far) didn't have any incompatible fields
    const indicesChecked = 1; // only one index has been checked so far
    const indices = 2; // total indices

    expect(
      showResult({
        incompatible,
        indices,
        indicesChecked,
      })
    ).toBe(false);
  });

  test('it returns false when `incompatible` is undefined', () => {
    const incompatible = undefined; // a state of undefined indicates there are no results
    const indicesChecked = 1; // all indices were checked
    const indices = 1; // total indices

    expect(
      showResult({
        incompatible,
        indices,
        indicesChecked,
      })
    ).toBe(false);
  });

  test('it returns false when `indices` is undefined', () => {
    const incompatible = 0; // none of the indices checked had incompatible fields
    const indicesChecked = 2; // all indices were checked
    const indices = undefined; // the total number of indices is unknown

    expect(
      showResult({
        incompatible,
        indices,
        indicesChecked,
      })
    ).toBe(false);
  });

  test('it returns false when `indicesChecked` is undefined', () => {
    const incompatible = 0; // none of the indices checked had incompatible fields
    const indicesChecked = undefined; // no indices were checked
    const indices = 2; // total indices

    expect(
      showResult({
        incompatible,
        indices,
        indicesChecked,
      })
    ).toBe(false);
  });
});
