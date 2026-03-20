/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { applySetStateAction } from './apply_set_state_action';

describe('applySetStateAction', () => {
  it('should apply a value action', () => {
    const oldState = { a: 1, b: 2 };
    const action = { a: 3, b: 4 };
    const newState = { a: 3, b: 4 };
    expect(applySetStateAction(action, oldState)).toEqual(newState);
  });

  it('should apply a function action', () => {
    const oldState = { a: 1, b: 2 };
    const action = (prevState: typeof oldState) => ({ a: prevState.a + 1, b: prevState.b + 1 });
    const newState = { a: 2, b: 3 };
    expect(applySetStateAction(action, oldState)).toEqual(newState);
  });
});
