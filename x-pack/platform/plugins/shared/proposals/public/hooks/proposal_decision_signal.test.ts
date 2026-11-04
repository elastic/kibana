/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { proposalDecisionSignal } from './proposal_decision_signal';

describe('proposalDecisionSignal', () => {
  it('notifies every subscriber when bumped', () => {
    const first = jest.fn();
    const second = jest.fn();
    const unsubscribeFirst = proposalDecisionSignal.subscribe(first);
    const unsubscribeSecond = proposalDecisionSignal.subscribe(second);

    proposalDecisionSignal.bump();

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
    unsubscribeFirst();
    unsubscribeSecond();
  });

  it('advances the snapshot on every bump, so a caller can detect a change it missed', () => {
    const before = proposalDecisionSignal.getSnapshot();
    proposalDecisionSignal.bump();
    expect(proposalDecisionSignal.getSnapshot()).toBe(before + 1);
  });

  it('stops notifying a listener once it unsubscribes', () => {
    const listener = jest.fn();
    const unsubscribe = proposalDecisionSignal.subscribe(listener);
    unsubscribe();

    proposalDecisionSignal.bump();

    expect(listener).not.toHaveBeenCalled();
  });
});
