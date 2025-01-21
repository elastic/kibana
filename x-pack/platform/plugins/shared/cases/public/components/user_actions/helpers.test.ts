/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isUserActionTypeSupported } from './helpers';

describe('Case view helpers', () => {});

describe('helpers', () => {
  describe('isUserActionTypeSupported', () => {
    const types: Array<[string, boolean]> = [
      ['comment', true],
      ['connector', true],
      ['description', true],
      ['pushed', true],
      ['tags', true],
      ['title', true],
      ['status', true],
      ['settings', true],
      ['create_case', true],
      ['delete_case', false],
    ];

    it.each(types)('determines if the type is support %s', (type, supported) => {
      expect(isUserActionTypeSupported(type)).toBe(supported);
    });
  });
});
