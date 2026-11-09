/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { inFlightDecisions, useIsDecisionInFlight } from './in_flight_decisions';

afterEach(() => inFlightDecisions.reset());

describe('inFlightDecisions', () => {
  it('tracks each kind and proposal on its own', () => {
    inFlightDecisions.start('approve', 'proposal-1');

    expect(inFlightDecisions.has('approve', 'proposal-1')).toBe(true);
    expect(inFlightDecisions.has('decline', 'proposal-1')).toBe(false);
    expect(inFlightDecisions.has('approve', 'other-proposal')).toBe(false);

    inFlightDecisions.end('approve', 'proposal-1');
    expect(inFlightDecisions.has('approve', 'proposal-1')).toBe(false);
  });

  it('stays in flight until every start has ended', () => {
    inFlightDecisions.start('approve', 'proposal-1');
    inFlightDecisions.start('approve', 'proposal-1');

    inFlightDecisions.end('approve', 'proposal-1');
    expect(inFlightDecisions.has('approve', 'proposal-1')).toBe(true);

    inFlightDecisions.end('approve', 'proposal-1');
    expect(inFlightDecisions.has('approve', 'proposal-1')).toBe(false);
  });

  it('keeps an unseen decision for its own kind and proposal until it is cleared', () => {
    inFlightDecisions.markUnseen('approve', 'proposal-1');

    expect(inFlightDecisions.hasUnseen('proposal-1', 'approve')).toBe(true);
    expect(inFlightDecisions.hasUnseen('proposal-1', 'decline')).toBe(false);
    expect(inFlightDecisions.hasUnseen('other-proposal')).toBe(false);

    inFlightDecisions.clearUnseen('proposal-1');
    expect(inFlightDecisions.hasUnseen('proposal-1')).toBe(false);
  });

  it('drops an unseen decision when a new decision starts for the proposal', () => {
    inFlightDecisions.markUnseen('approve', 'proposal-1');
    inFlightDecisions.start('decline', 'proposal-1');

    expect(inFlightDecisions.hasUnseen('proposal-1')).toBe(false);
  });
});

describe('useIsDecisionInFlight', () => {
  it('follows the store for the given kind and proposal', () => {
    const { result } = renderHook(() => ({
      approvingProposal1: useIsDecisionInFlight('approve', 'proposal-1', false),
      decliningProposal1: useIsDecisionInFlight('decline', 'proposal-1', false),
      approvingOther: useIsDecisionInFlight('approve', 'other-proposal', false),
    }));
    expect(result.current).toEqual({
      approvingProposal1: false,
      decliningProposal1: false,
      approvingOther: false,
    });

    act(() => inFlightDecisions.start('approve', 'proposal-1'));
    expect(result.current).toEqual({
      approvingProposal1: true,
      decliningProposal1: false,
      approvingOther: false,
    });

    act(() => inFlightDecisions.end('approve', 'proposal-1'));
    expect(result.current.approvingProposal1).toBe(false);
  });

  it('is false when the id is undefined', () => {
    inFlightDecisions.start('approve', 'proposal-1');
    const { result } = renderHook(() => useIsDecisionInFlight('approve', undefined, false));

    expect(result.current).toBe(false);
  });

  it('counts an unseen decision only until the data of the row shows it', () => {
    inFlightDecisions.markUnseen('approve', 'proposal-1');
    const { result, rerender } = renderHook(
      ({ shown }) => useIsDecisionInFlight('approve', 'proposal-1', shown),
      { initialProps: { shown: false } }
    );
    expect(result.current).toBe(true);

    rerender({ shown: true });
    expect(result.current).toBe(false);
  });
});

describe('useIsDecisionInFlight renders', () => {
  it('does not render again for a decision on another proposal', () => {
    let renders = 0;
    renderHook(() => {
      renders += 1;
      return useIsDecisionInFlight('approve', 'proposal-1', false);
    });
    const before = renders;

    act(() => inFlightDecisions.start('approve', 'other-proposal'));
    act(() => inFlightDecisions.end('approve', 'other-proposal'));

    expect(renders).toBe(before);
  });
});
