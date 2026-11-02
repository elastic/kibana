/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getApprovalActorOutcome, type ApprovalPhase } from './approval_outcome';

describe('getApprovalActorOutcome', () => {
  it.each<[ApprovalPhase, ReturnType<typeof getApprovalActorOutcome>]>([
    ['applying', 'approved'],
    ['applied', 'approved'],
    ['no_action', 'approved'],
    ['marked_applied', 'applied'],
    ['declined', 'declined'],
    ['failed', 'executed'],
    ['pending', undefined],
    ['declining', undefined],
    ['expired', undefined],
  ])('reads %s as %s', (phase, expected) => {
    expect(getApprovalActorOutcome(phase)).toBe(expected);
  });
});
