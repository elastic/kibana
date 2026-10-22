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

  it("opens a classic alert's details page when the alert version is v1", () => {
    expect(
      getSubjectLocatorTarget({ type: 'alert', id: 'alert-uuid', alertVersion: 'v1' })
    ).toEqual({
      locatorId: 'ALERTS_LOCATOR',
      params: { alertId: 'alert-uuid' },
    });
  });

  it("opens an alerting v2 episode's details page in Observability Alerting", () => {
    expect(getSubjectLocatorTarget({ type: 'alert', id: 'episode-1', alertVersion: 'v2' })).toEqual(
      {
        locatorId: 'ALERTING_V2_EPISODES_LOCATOR',
        params: {
          episodeId: 'episode-1',
          host: { app: 'observabilityAlerting', pathPrefix: '/alerts' },
        },
      }
    );
  });

  it('has no page for significant events, questions and Slack threads', () => {
    expect(getSubjectLocatorTarget({ type: 'significant_event', id: 'se-1' })).toBeUndefined();
    expect(getSubjectLocatorTarget({ type: 'manual', id: 'q-1' })).toBeUndefined();
    expect(getSubjectLocatorTarget({ type: 'slack_thread', id: 't-1' })).toBeUndefined();
  });
});
