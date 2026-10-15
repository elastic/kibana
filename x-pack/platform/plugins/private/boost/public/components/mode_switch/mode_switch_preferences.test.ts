/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isModeSwitchConfirmationSkipped,
  resetModeSwitchConfirmations,
  skipModeSwitchConfirmation,
} from './mode_switch_preferences';

describe('mode switch confirmation preferences', () => {
  afterEach(() => localStorage.clear());

  it('skips confirming each direction separately', () => {
    skipModeSwitchConfirmation('simple');

    expect(isModeSwitchConfirmationSkipped('simple')).toBe(true);
    expect(isModeSwitchConfirmationSkipped('advanced')).toBe(false);
  });

  it('confirms both directions again once reset', () => {
    skipModeSwitchConfirmation('simple');
    skipModeSwitchConfirmation('advanced');

    resetModeSwitchConfirmations();

    expect(isModeSwitchConfirmationSkipped('simple')).toBe(false);
    expect(isModeSwitchConfirmationSkipped('advanced')).toBe(false);
  });
});
