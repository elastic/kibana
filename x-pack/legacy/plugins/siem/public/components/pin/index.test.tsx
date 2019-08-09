/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getPinRotation } from './';

describe('pin', () => {
  describe('getPinRotation', () => {
    test('it returns a vertical pin when pinned is true', () => {
      expect(getPinRotation(true)).toEqual('rotate(0)');
    });

    test('it returns a rotated (UNpinned) pin when pinned is false', () => {
      expect(getPinRotation(false)).toEqual('rotate(45)');
    });
  });
});
