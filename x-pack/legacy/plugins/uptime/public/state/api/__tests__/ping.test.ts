/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mergeParams } from '../ping';

describe('ping', () => {
  describe('mergeParams', () => {
    it('returns the guaranteed params if there are no falsy params', () => {
      expect(mergeParams({ foo: 'bar' }, {})).toMatchInlineSnapshot(`
        Object {
          "foo": "bar",
        }
      `);
    });

    it('adds truthy params while ignoring falsy params', () => {
      expect(mergeParams({ young: 'star' }, { h: 1, he: 2, li: undefined })).toMatchInlineSnapshot(`
        Object {
          "h": 1,
          "he": 2,
          "young": "star",
        }
      `);
    });
  });
});
