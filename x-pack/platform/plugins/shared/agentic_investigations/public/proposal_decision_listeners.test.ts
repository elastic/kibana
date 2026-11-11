/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  addProposalDecidedListener,
  notifyProposalDecided,
  type ProposalDecidedEvent,
} from './proposal_decision_listeners';

const event: ProposalDecidedEvent = {
  proposalId: 'p1',
  decision: 'decline',
  surface: 'flyout',
  dismissReason: 'duplicate',
};

describe('proposal decision listeners', () => {
  it('notifies every listener until it unsubscribes', () => {
    const first = jest.fn();
    const second = jest.fn();
    const unsubscribeFirst = addProposalDecidedListener(first);
    const unsubscribeSecond = addProposalDecidedListener(second);

    notifyProposalDecided(event);
    unsubscribeFirst();
    notifyProposalDecided(event);
    unsubscribeSecond();

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(2);
    expect(first).toHaveBeenCalledWith(event);
  });

  it('keeps notifying the others when one listener throws', () => {
    const throwing = jest.fn(() => {
      throw new Error('boom');
    });
    const healthy = jest.fn();
    const unsubscribeThrowing = addProposalDecidedListener(throwing);
    const unsubscribeHealthy = addProposalDecidedListener(healthy);

    expect(() => notifyProposalDecided(event)).not.toThrow();
    unsubscribeThrowing();
    unsubscribeHealthy();

    expect(healthy).toHaveBeenCalledWith(event);
  });
});
