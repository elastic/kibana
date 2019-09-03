/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getPinIcon } from './';

describe('pin', () => {
  describe('getPinRotation', () => {
    test('it returns a filled pin when pinned is true', () => {
      expect(getPinIcon(true)).toEqual('pinFilled');
    });

    test('it returns an non-filled pin when pinned is false', () => {
      expect(getPinIcon(false)).toEqual('pin');
    });
  });
});
