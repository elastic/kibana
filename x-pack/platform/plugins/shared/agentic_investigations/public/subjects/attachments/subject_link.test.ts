/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSubjectLocatorTarget } from './subject_link';

describe('getSubjectLocatorTarget', () => {
  it("opens an alert's details page by its id", () => {
    expect(getSubjectLocatorTarget({ type: 'alert', id: 'alert-uuid' })).toEqual({
      locatorId: 'ALERTS_LOCATOR',
      params: { alertId: 'alert-uuid' },
    });
  });

  it('opens a significant event in the Significant Events app', () => {
    expect(getSubjectLocatorTarget({ type: 'significant_event', id: 'se-1' })).toEqual({
      locatorId: 'SIGNIFICANT_EVENTS_APP_LOCATOR',
      params: { tab: 'significant_events', selectedEvent: 'se-1' },
    });
  });

  it('has no page for questions and Slack threads', () => {
    expect(getSubjectLocatorTarget({ type: 'manual', id: 'q-1' })).toBeUndefined();
    expect(getSubjectLocatorTarget({ type: 'slack_thread', id: 't-1' })).toBeUndefined();
  });
});
