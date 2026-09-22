/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPendingCurrentRound, pendingRoundId } from './new_conversation';

describe('isPendingCurrentRound', () => {
  it('returns true for the current local pending round', () => {
    expect(isPendingCurrentRound({ isCurrentRound: true, roundId: pendingRoundId })).toBe(true);
  });

  it('returns false when the round is not current', () => {
    expect(isPendingCurrentRound({ isCurrentRound: false, roundId: pendingRoundId })).toBe(false);
  });

  it('returns false when the current round is not local pending', () => {
    expect(isPendingCurrentRound({ isCurrentRound: true, roundId: 'round-1' })).toBe(false);
  });
});
