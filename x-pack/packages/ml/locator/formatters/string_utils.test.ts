/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getGroupQueryText } from './string_utils';

describe('getGroupQueryText', () => {
  const groupIdOne = 'test_group_id_1';
  const groupIdTwo = 'test_group_id_2';

  it('should get query string for selected group ids', () => {
    const actual = getGroupQueryText([groupIdOne, groupIdTwo]);
    expect(actual).toBe(`groups:(${groupIdOne} or ${groupIdTwo})`);
  });

  it('should get query string for selected group id', () => {
    const actual = getGroupQueryText([groupIdOne]);
    expect(actual).toBe(`groups:(${groupIdOne})`);
  });
});
