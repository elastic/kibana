/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getScopeFilterState,
  getStopNotificationsModalCopy,
} from './get_stop_notifications_modal_copy';

describe('getScopeFilterState', () => {
  it('returns off when the scope is turned off', () => {
    expect(getScopeFilterState(false, { kql: 'a' })).toBe('off');
  });

  it('returns filtered when the scope has a filter payload', () => {
    expect(getScopeFilterState(true, { kql: 'a' })).toBe('filtered');
  });

  it('returns unfiltered when the scope has no filter payload', () => {
    expect(getScopeFilterState(true, null)).toBe('unfiltered');
  });
});

describe('getStopNotificationsModalCopy', () => {
  it('returns null when every turned-on scope has a filter', () => {
    expect(getStopNotificationsModalCopy('filtered', 'filtered')).toBeNull();
    expect(getStopNotificationsModalCopy('filtered', 'off')).toBeNull();
    expect(getStopNotificationsModalCopy('off', 'off')).toBeNull();
  });

  it('names Classic Alerting when it is the only unfiltered scope', () => {
    expect(getStopNotificationsModalCopy('unfiltered', 'off')).toEqual({
      title: 'Stop notifications for Classic alerts?',
      body: 'This window has no filter, so it covers every alert. To limit it to specific alerts, cancel and add a filter.',
    });
  });

  it('names Universal Alerting when it is the only unfiltered scope', () => {
    expect(getStopNotificationsModalCopy('off', 'unfiltered')).toEqual({
      title: 'Stop notifications for Universal alerts?',
      body: 'This window has no filter, so it covers every alert. To limit it to specific alerts, cancel and add a filter.',
    });
  });

  it('names both systems when neither turned-on scope has a filter', () => {
    expect(getStopNotificationsModalCopy('unfiltered', 'unfiltered')).toEqual({
      title: 'Stop notifications for Classic and Universal alerts?',
      body: 'This window has no filter, so it covers every alert. To limit it to specific alerts, cancel and add a filter.',
    });
  });

  it('explains that Classic Alerting keeps its filter when only Universal Alerting is unfiltered', () => {
    expect(getStopNotificationsModalCopy('filtered', 'unfiltered')).toEqual({
      title: 'Stop notifications for Universal alerts?',
      body: 'This window has no Universal filter, so it covers every Universal alert. The Classic filter still applies. To limit it to specific Universal alerts, cancel and add a filter.',
    });
  });

  it('explains that Universal Alerting keeps its filter when only Classic Alerting is unfiltered', () => {
    expect(getStopNotificationsModalCopy('unfiltered', 'filtered')).toEqual({
      title: 'Stop notifications for Classic alerts?',
      body: 'This window has no Classic filter, so it covers every Classic alert. The Universal filter still applies. To limit it to specific Classic alerts, cancel and add a filter.',
    });
  });
});
