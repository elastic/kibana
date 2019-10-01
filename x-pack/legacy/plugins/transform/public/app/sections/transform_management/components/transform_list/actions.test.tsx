/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getActions } from './actions';

jest.mock('ui/new_platform');

describe('Transform: Transform List Actions', () => {
  test('getActions()', () => {
    const actions = getActions({ forceDisable: false });

    expect(actions).toHaveLength(2);
    expect(actions[0].isPrimary).toBeTruthy();
    expect(typeof actions[0].render).toBe('function');
    expect(typeof actions[1].render).toBe('function');
  });
});
