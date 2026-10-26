/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAlertsListLocatorTarget, getSubjectLocatorTarget } from './subject_link';

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

describe('getAlertsListLocatorTarget', () => {
  const alert = (id: string, start?: string) => ({
    type: 'alert' as const,
    id,
    ...(start ? { snapshot: { start } } : {}),
  });

  it('opens the alerts list filtered to the alerts, over every status', () => {
    expect(
      getAlertsListLocatorTarget([
        alert('a-2', '2026-07-28T14:05:00.000Z'),
        { type: 'manual', id: 'q-1' },
        alert('a-1', '2026-07-28T14:02:00.000Z'),
      ])
    ).toEqual({
      locatorId: 'ALERTING_V2_EPISODES_LOCATOR',
      params: {
        host: { app: 'observabilityAlerting', pathPrefix: '/alerts' },
        filters: {
          queryString: 'alert.id: ("a-2" or "a-1") or kibana.alert.uuid: ("a-2" or "a-1")',
          status: 'all',
        },
        // A minute before the earliest alert, so the list covers all of them.
        timeRange: { from: '2026-07-28T14:01:00.000Z', to: 'now' },
      },
    });
  });

  it('falls back to a wide range when no alert says when it started', () => {
    expect(getAlertsListLocatorTarget([alert('a-1'), alert('a-2')])?.params.timeRange).toEqual({
      from: 'now-30d',
      to: 'now',
    });
  });

  it('has no list without alerts', () => {
    expect(getAlertsListLocatorTarget([{ type: 'manual', id: 'q-1' }])).toBeUndefined();
  });
});
