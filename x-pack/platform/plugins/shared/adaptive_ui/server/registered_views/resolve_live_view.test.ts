/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { SignificantEvent } from '@kbn/significant-events-schema';
import { registeredViewIds } from '../../common/constants';
import { resolveLiveView, type ResolveLiveViewDeps } from './resolve_live_view';

const request = {} as KibanaRequest;

const liveEvent: SignificantEvent = {
  event_id: 'evt-003',
  event_uuid: 'evt-003-v1',
  '@timestamp': '2026-08-25T13:49:13.000Z',
  title: 'Elasticsearch cluster — disk watermark write throttling',
  summary:
    'Disk usage crossed the 85% high watermark on five data nodes, reaching 88.9% utilization.',
  status: 'open',
  severity: '80-critical',
  confidence: 0.91,
  stream_names: ['logs.elasticsearch'],
  symptom_hypothesis: 'ILM retention misconfiguration left long-lived indices active.',
};

const liveInvestigation = {
  investigation_id: 'inv-003',
  subject: { type: 'significant_event' as const, id: 'evt-003' },
  status: 'completed' as const,
  conclusion: 'Missing retention policies caused unbounded growth.',
  result: {
    summary: 'Investigate disk watermark write throttling on logs.elasticsearch.',
    conclusion: 'ILM retention misconfiguration left long-lived indices active.',
    hypotheses: [
      {
        candidate: 'ILM retention misconfiguration left long-lived indices active',
        confidence: 0.91,
        status: 'confirmed' as const,
      },
    ],
    recommendations: [
      {
        title: 'Restore the missing ILM policy',
        description: 'Attach a delete phase at 30 days for the elasticsearch logs datastream.',
      },
    ],
    blind_spots: [
      {
        title: 'No hot/warm allocation metrics',
        description: 'Node disk stats are sampled without per-index breakdown.',
      },
    ],
  },
};

const createDeps = (overrides: Partial<ResolveLiveViewDeps> = {}): ResolveLiveViewDeps => ({
  getSignificantEvents: async () => ({
    getEventById: async () => liveEvent,
  }),
  getNightshiftInvestigations: async () => ({
    getInvestigationsClient: () => ({
      get: async () => liveInvestigation,
    }),
  }),
  ...overrides,
});

describe('resolveLiveView', () => {
  it('renders a live significant event and does not fall back to payment-service sample data', async () => {
    const result = await resolveLiveView(
      registeredViewIds.significantEvent,
      { event_id: 'evt-003' },
      request,
      createDeps()
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.spec.title).toBe(liveEvent.title);
    const rendered = JSON.stringify(result.spec);
    expect(rendered).toContain('logs.elasticsearch');
    expect(rendered).not.toContain('payment-service');
    expect(rendered).not.toContain('Dropped payments');
  });

  it('errors when event_id is missing instead of rendering sample data', async () => {
    const result = await resolveLiveView(
      registeredViewIds.significantEvent,
      {},
      request,
      createDeps()
    );

    expect(result).toEqual({
      ok: false,
      message: expect.stringContaining('event_id'),
    });
  });

  it('errors when the significant event does not exist', async () => {
    const result = await resolveLiveView(
      registeredViewIds.significantEvent,
      { event_id: 'evt-missing' },
      request,
      createDeps({
        getSignificantEvents: async () => ({
          getEventById: async () => undefined,
        }),
      })
    );

    expect(result).toEqual({
      ok: false,
      message: 'Significant event "evt-missing" was not found.',
    });
  });

  it('renders a live investigation by id', async () => {
    const result = await resolveLiveView(
      registeredViewIds.investigation,
      { investigation_id: 'inv-003' },
      request,
      createDeps()
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.spec.title).toContain('ILM retention');
    const rendered = JSON.stringify(result.spec);
    expect(rendered).toContain('Restore the missing ILM policy');
    expect(rendered).not.toContain('payment-service');
  });

  it('resolves an investigation from the event’s latest attached workflow', async () => {
    const get = jest.fn().mockResolvedValue(liveInvestigation);
    const result = await resolveLiveView(
      registeredViewIds.investigation,
      { event_id: 'evt-003' },
      request,
      createDeps({
        getSignificantEvents: async () => ({
          getEventById: async () => ({
            ...liveEvent,
            investigations: [
              {
                workflow_execution_id: 'inv-old',
                started_at: '2026-08-25T12:00:00.000Z',
                completed_at: '2026-08-25T12:10:00.000Z',
              },
              {
                workflow_execution_id: 'inv-003',
                started_at: '2026-08-25T13:00:00.000Z',
                completed_at: '2026-08-25T13:20:00.000Z',
              },
            ],
          }),
        }),
        getNightshiftInvestigations: async () => ({
          getInvestigationsClient: () => ({ get }),
        }),
      })
    );

    expect(get).toHaveBeenCalledWith('inv-003');
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(JSON.stringify(result.spec)).not.toContain('payment-service');
  });
});
