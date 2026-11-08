/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isDetailsFlyoutOpen,
  registerOpenDetailsFlyout,
  requestDetailsTab,
  subscribeToDetailsTabRequests,
} from './details_flyout_registry';

describe('details flyout registry', () => {
  it('knows which conversations have a flyout open', () => {
    const unregister = registerOpenDetailsFlyout('a');
    expect(isDetailsFlyoutOpen('a')).toBe(true);
    expect(isDetailsFlyoutOpen('b')).toBe(false);
    unregister();
    expect(isDetailsFlyoutOpen('a')).toBe(false);
  });

  it('keeps a conversation open until its last flyout closes', () => {
    const first = registerOpenDetailsFlyout('a');
    const second = registerOpenDetailsFlyout('a');
    first();
    expect(isDetailsFlyoutOpen('a')).toBe(true);
    second();
    expect(isDetailsFlyoutOpen('a')).toBe(false);
  });

  it('passes a tab request to subscribers until they unsubscribe', () => {
    const listener = jest.fn();
    const unsubscribe = subscribeToDetailsTabRequests(listener);
    requestDetailsTab('a', 'impactMap');
    unsubscribe();
    requestDetailsTab('a', 'timeline');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith('a', 'impactMap');
  });
});
