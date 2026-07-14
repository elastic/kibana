/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { eventsWriteHandler } from './handler';

const baseInput = {
  discovery_id: 'disc-1',
  status: 'promoted' as const,
  stream_names: ['logs.checkout'],
  rule_names: ['high-latency-rule'],
  title: 'Checkout latency',
  summary: 'P99 latency breached SLO',
  root_cause: 'Connection pool exhaustion',
  criticality: 80,
  confidence: 0.82,
  recommendations: ['Increase pool size'],
  assessment_note: 'Verified via execute_esql',
  evidences: [],
  cause_kis: [],
  dependency_edges: [],
  infra_components: [],
};

describe('eventsWriteHandler', () => {
  it('writes a new event when no existing event exists', async () => {
    const eventClient = {
      findLatestBySlugs: jest.fn().mockResolvedValue(new Map()),
      bulkCreate: jest.fn().mockResolvedValue(undefined),
    };

    const result = await eventsWriteHandler({
      eventClient: eventClient as never,
      input: { ...baseInput, discovery_slug: 'checkout__latency-abc12345' },
    });

    expect(eventClient.bulkCreate).toHaveBeenCalledTimes(1);
    expect(result.written).toBe(true);
    expect(result.discovery_slug).toBe('checkout__latency-abc12345');
    expect(result.status).toBe('promoted');
    expect(typeof result.event_id).toBe('string');
  });

  it('skips write when status is unchanged', async () => {
    const eventClient = {
      findLatestBySlugs: jest
        .fn()
        .mockResolvedValue(
          new Map([['checkout__latency-abc12345', { event_id: 'latest-id', status: 'promoted' }]])
        ),
      bulkCreate: jest.fn(),
    };

    const result = await eventsWriteHandler({
      eventClient: eventClient as never,
      input: { ...baseInput, discovery_slug: 'checkout__latency-abc12345', status: 'promoted' },
    });

    expect(eventClient.bulkCreate).not.toHaveBeenCalled();
    expect(result.written).toBe(false);
    expect(result.reason).toBe('status_unchanged');
    expect(result.event_id).toBe('latest-id');
  });

  it('generates a synthetic slug and skips dedup lookup when discovery_slug is absent', async () => {
    const eventClient = {
      findLatestBySlugs: jest.fn(),
      bulkCreate: jest.fn().mockResolvedValue(undefined),
    };

    const result = await eventsWriteHandler({
      eventClient: eventClient as never,
      input: { ...baseInput },
    });

    expect(eventClient.findLatestBySlugs).not.toHaveBeenCalled();
    expect(result.written).toBe(true);
    expect(result.discovery_slug).toMatch(/^agent-event-[a-f0-9]{8}$/);
  });

  it('persists rule_names so event_search can match continuation candidates', async () => {
    const eventClient = {
      findLatestBySlugs: jest.fn().mockResolvedValue(new Map()),
      bulkCreate: jest.fn().mockResolvedValue(undefined),
    };

    await eventsWriteHandler({
      eventClient: eventClient as never,
      input: { ...baseInput, discovery_slug: 'checkout__latency-abc12345' },
    });

    const written = eventClient.bulkCreate.mock.calls[0][0][0];
    expect(written.rule_names).toEqual(['high-latency-rule']);
  });

  it('sets previous_event_id from the latest event returned by findLatestBySlugs', async () => {
    const eventClient = {
      findLatestBySlugs: jest
        .fn()
        .mockResolvedValue(
          new Map([
            ['checkout__latency-abc12345', { event_id: 'latest-id', status: 'acknowledged' }],
          ])
        ),
      bulkCreate: jest.fn().mockResolvedValue(undefined),
    };

    const result = await eventsWriteHandler({
      eventClient: eventClient as never,
      input: { ...baseInput, discovery_slug: 'checkout__latency-abc12345', status: 'promoted' },
    });

    expect(eventClient.bulkCreate).toHaveBeenCalledTimes(1);
    const written = eventClient.bulkCreate.mock.calls[0][0][0];
    expect(written.previous_event_id).toBe('latest-id');
    expect(result.written).toBe(true);
  });
});
