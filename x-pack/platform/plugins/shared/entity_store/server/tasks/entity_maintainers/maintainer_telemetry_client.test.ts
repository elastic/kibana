/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMaintainerTelemetryClient } from './maintainer_telemetry_client';
import { ENTITY_MAINTAINER_RUN_SUMMARY_EVENT } from '../../telemetry/events';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function createMockAnalytics() {
  return { reportEvent: jest.fn() };
}

const BASE_FUNNEL = {
  scanned: 100,
  qualified: 80,
  proposed: 70,
  applied: 65,
  failed: 5,
};

describe('createMaintainerTelemetryClient', () => {
  it('does not emit when flush is called with no prior report', () => {
    const analytics = createMockAnalytics();
    const client = createMaintainerTelemetryClient({
      id: 'accesses',
      namespace: 'default',
      analytics,
    });

    client.flush({ durationMs: 100, aborted: false });

    expect(analytics.reportEvent).not.toHaveBeenCalled();
  });

  it('emits one event when report is called once then flushed', () => {
    const analytics = createMockAnalytics();
    const client = createMaintainerTelemetryClient({
      id: 'accesses',
      namespace: 'default',
      analytics,
    });

    client.report({ funnel: BASE_FUNNEL });
    client.flush({ durationMs: 250, aborted: false });

    expect(analytics.reportEvent).toHaveBeenCalledTimes(1);
    const [event, payload] = analytics.reportEvent.mock.calls[0];
    expect(event).toBe(ENTITY_MAINTAINER_RUN_SUMMARY_EVENT);
    expect(payload.id).toBe('accesses');
    expect(payload.namespace).toBe('default');
    expect(payload.runId).toMatch(UUID_REGEX);
    expect(payload.durationMs).toBe(250);
    expect(payload.aborted).toBe(false);
    expect(payload.funnel).toEqual(BASE_FUNNEL);
    expect(payload.errorClass).toBeUndefined();
    expect(payload.errorMessage).toBeUndefined();
  });

  it('emits N events and shares one runId when report is called N times', () => {
    const analytics = createMockAnalytics();
    const client = createMaintainerTelemetryClient({
      id: 'risk-score',
      namespace: 'default',
      analytics,
    });

    client.report({ funnel: BASE_FUNNEL, scope: { kind: 'entity_type', value: 'host' } });
    client.report({ funnel: BASE_FUNNEL, scope: { kind: 'entity_type', value: 'user' } });
    client.report({ funnel: BASE_FUNNEL, scope: { kind: 'entity_type', value: 'service' } });
    client.flush({ durationMs: 500, aborted: false });

    expect(analytics.reportEvent).toHaveBeenCalledTimes(3);

    const runIds = analytics.reportEvent.mock.calls.map(([, p]) => p.runId);
    expect(new Set(runIds).size).toBe(1);

    const scopes = analytics.reportEvent.mock.calls.map(([, p]) => p.scope?.value);
    expect(scopes).toEqual(['host', 'user', 'service']);
  });

  it('populates errorClass and truncated errorMessage on error flush', () => {
    const analytics = createMockAnalytics();
    const client = createMaintainerTelemetryClient({
      id: 'automated-resolution',
      namespace: 'default',
      analytics,
    });

    const longMessage = 'x'.repeat(600);
    client.report({ funnel: BASE_FUNNEL });
    client.flush({
      durationMs: 10,
      aborted: false,
      errorClass: 'EsError',
      errorMessage: longMessage,
    });

    const [, payload] = analytics.reportEvent.mock.calls[0];
    expect(payload.errorClass).toBe('EsError');
    expect(payload.errorMessage).toHaveLength(500);
  });

  it('sets aborted: true when flush indicates abort', () => {
    const analytics = createMockAnalytics();
    const client = createMaintainerTelemetryClient({
      id: 'watchlist',
      namespace: 'default',
      analytics,
    });

    client.report({ funnel: BASE_FUNNEL });
    client.flush({ durationMs: 50, aborted: true });

    const [, payload] = analytics.reportEvent.mock.calls[0];
    expect(payload.aborted).toBe(true);
  });

  it('forwards optional fields from report to the emitted event', () => {
    const analytics = createMockAnalytics();
    const client = createMaintainerTelemetryClient({
      id: 'accesses',
      namespace: 'default',
      analytics,
    });

    client.report({
      funnel: { ...BASE_FUNNEL, droppedNotInStore: 3, skipped: 1 },
      iterations: 5,
      truncated: true,
      sources: [
        { id: 'aws_cloudtrail', scanned: 60, qualified: 50, outcome: 'producing' },
        { id: 'okta', scanned: 40, qualified: 30, outcome: 'partial' },
      ],
      breakdown: [
        { name: 'accesses_frequently', count: 40 },
        { name: 'accesses_infrequently', count: 25 },
      ],
    });
    client.flush({ durationMs: 300, aborted: false });

    const [, payload] = analytics.reportEvent.mock.calls[0];
    expect(payload.funnel.droppedNotInStore).toBe(3);
    expect(payload.funnel.skipped).toBe(1);
    expect(payload.iterations).toBe(5);
    expect(payload.truncated).toBe(true);
    expect(payload.sources).toHaveLength(2);
    expect(payload.sources[0].id).toBe('aws_cloudtrail');
    expect(payload.breakdown).toHaveLength(2);
  });

  it('forwards stages[] entries from report to the emitted event', () => {
    const analytics = createMockAnalytics();
    const client = createMaintainerTelemetryClient({
      id: 'risk-score',
      namespace: 'default',
      analytics,
    });

    client.report({
      funnel: BASE_FUNNEL,
      scope: { kind: 'entity_type', value: 'host' },
      stages: [
        { name: 'fetch_scores', status: 'success', durationMs: 120, applied: 65 },
        {
          name: 'apply_decay',
          status: 'skipped',
          durationMs: 0,
          skipReason: 'no_eligible_entities',
        },
        { name: 'write_alerts', status: 'error', durationMs: 30, errorKind: 'es_timeout' },
      ],
    });
    client.flush({ durationMs: 400, aborted: false });

    const [, payload] = analytics.reportEvent.mock.calls[0];
    expect(payload.stages).toHaveLength(3);
    expect(payload.stages[0]).toEqual({
      name: 'fetch_scores',
      status: 'success',
      durationMs: 120,
      applied: 65,
    });
    expect(payload.stages[1].status).toBe('skipped');
    expect(payload.stages[1].skipReason).toBe('no_eligible_entities');
    expect(payload.stages[2].status).toBe('error');
    expect(payload.stages[2].errorKind).toBe('es_timeout');
  });

  it('generates a fresh runId for each client instance', () => {
    const analytics = createMockAnalytics();
    const client1 = createMaintainerTelemetryClient({
      id: 'accesses',
      namespace: 'default',
      analytics,
    });
    const client2 = createMaintainerTelemetryClient({
      id: 'accesses',
      namespace: 'default',
      analytics,
    });

    client1.report({ funnel: BASE_FUNNEL });
    client1.flush({ durationMs: 10, aborted: false });
    client2.report({ funnel: BASE_FUNNEL });
    client2.flush({ durationMs: 10, aborted: false });

    const runId1 = analytics.reportEvent.mock.calls[0][1].runId;
    const runId2 = analytics.reportEvent.mock.calls[1][1].runId;
    expect(runId1).not.toBe(runId2);
  });
});
