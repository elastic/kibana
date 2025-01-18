/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateRequiredGroupInDefaultActions } from './v1';

describe('validateRequiredGroupInDefaultActions', () => {
  const isSystemAction = jest.fn().mockImplementation((id) => id === 'system_action-id');

  it('throws an error if the action is missing the group', () => {
    expect(() =>
      validateRequiredGroupInDefaultActions({
        actions: [{ id: 'test' }],
        isSystemAction,
      })
    ).toThrowErrorMatchingInlineSnapshot(`"Group is not defined in action test"`);
  });

  it('does not throw an error if the action has the group', () => {
    expect(() =>
      validateRequiredGroupInDefaultActions({
        actions: [{ id: 'test', group: 'default' }],
        isSystemAction,
      })
    ).not.toThrow();
  });

  it('does not throw an error if the action is a system action and is missing the group', () => {
    expect(() =>
      validateRequiredGroupInDefaultActions({
        actions: [{ id: 'system_action-id' }],
        isSystemAction,
      })
    ).not.toThrow();
  });
});
