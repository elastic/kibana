/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRecoveryAction, getSavedObjectActionPrefix } from './recovery';
import { Actions } from '..';

const actions = new Actions();

describe('recovery actions', () => {
  it('names the recovery action of a type as a Saved Objects action', () => {
    expect(getRecoveryAction(actions, 'action')).toBe(
      actions.savedObject.get('action', 'manage_access_control')
    );
  });

  it('gives the prefix that every Saved Objects action of the type starts with', () => {
    const prefix = getSavedObjectActionPrefix(actions, 'action');

    expect(actions.savedObject.get('action', 'get').startsWith(prefix)).toBe(true);
    expect(actions.savedObject.get('action_task_params', 'get').startsWith(prefix)).toBe(false);
  });
});
