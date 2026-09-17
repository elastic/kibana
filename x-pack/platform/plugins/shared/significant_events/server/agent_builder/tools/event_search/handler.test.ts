/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_SIGNAL_DESCRIPTION_LENGTH } from '@kbn/significant-events-schema';
import {
  searchEventsToolHandler,
  DESCRIPTION_TRUNCATION_SUFFIX,
  DESCRIPTION_CONTENT_LENGTH,
} from './handler';

describe('searchEventsToolHandler', () => {
  const event = {
    '@timestamp': '2026-07-20T08:00:00.000Z',
    event_id: 'checkout-failure',
    event_uuid: 'e1',
    title: 'Checkout — payment failure',
    symptom_hypothesis: 'Payment calls are failing',
    summary: 'Checkout payment calls fail.',
    status: 'open',
    severity: '60-high',
    confidence: 0.8,
    stream_names: ['logs.checkout'],
    signals: [
      {
        type: 'detection',
        stream_name: 'logs.checkout',
        verdict: 'confirms',
        description: 'Payment call failed',
        collected_at: '2026-07-20T08:00:00.000Z',
        metadata: { rule_uuid: 'rule-active', rule_name: 'Payment failures' },
      },
      {
        type: 'detection',
        stream_name: 'logs.checkout',
        verdict: 'refutes',
        description: 'Recovered payment call',
        collected_at: '2026-07-19T08:00:00.000Z',
        metadata: { rule_uuid: 'rule-clear', rule_name: 'Payment recovery' },
      },
      {
        type: 'detection',
        stream_name: 'logs.checkout',
        verdict: 'inconclusive',
        description: 'Pending verification',
        collected_at: '2026-07-18T08:00:00.000Z',
        metadata: { rule_uuid: 'rule-unknown', rule_name: 'Payment latency' },
      },
    ],
    causal_features: [{ feature_id: 'checkout-payment', name: 'Checkout to payment' }],
    blast_radius: [{ feature_id: 'checkout-payment', type: 'dependency' }],
  };

  const makeClient = (hits: object[] = [event], total = hits.length) => ({
    findLatestByCurrentStatePaginated: jest
      .fn()
      .mockResolvedValue({ hits, page: 1, perPage: 20, total }),
    findLatestPaginated: jest.fn().mockResolvedValue({ hits, page: 1, perPage: 20, total }),
  });

  it('returns a bounded compact routing projection with complete signal state', async () => {
    const result = await searchEventsToolHandler({
      eventClient: makeClient() as never,
      params: { rule_uuids: ['rule-active'] },
    });

    expect(result.events).toEqual([
      expect.objectContaining({
        event_id: 'checkout-failure',
        symptom_hypothesis: 'Payment calls are failing',
        summary: 'Checkout payment calls fail.',
        signal_rule_uuids: ['rule-active', 'rule-clear', 'rule-unknown'],
        unresolved_rule_uuids: ['rule-active', 'rule-unknown'],
        signal_counts: {
          total: 3,
          confirms: 1,
          refutes: 1,
          off_topic: 0,
          inconclusive: 1,
          not_checked: 0,
        },
      }),
    ]);
    expect(result.events[0]).not.toHaveProperty('signals');
    expect(result.events[0].symptom_hypothesis).toBe('Payment calls are failing');
  });

  it('does not hide inconclusive signals from closure routing', async () => {
    const result = await searchEventsToolHandler({
      eventClient: makeClient([{ ...event, signals: [event.signals[2]] }]) as never,
      params: { event_ids: ['checkout-failure'] },
    });

    expect(result.events[0]).toEqual(
      expect.objectContaining({
        unresolved_rule_uuids: ['rule-unknown'],
        signal_counts: {
          total: 1,
          confirms: 0,
          refutes: 0,
          off_topic: 0,
          inconclusive: 1,
          not_checked: 0,
        },
      })
    );
  });

  it('reports off-topic rules without making their authored rule unresolved', async () => {
    const result = await searchEventsToolHandler({
      eventClient: makeClient([
        {
          ...event,
          signals: [
            {
              ...event.signals[0],
              verdict: 'off_topic',
              metadata: { rule_uuid: 'rule-off-topic', rule_name: 'Unrelated error' },
            },
          ],
        },
      ]) as never,
      params: { event_ids: ['checkout-failure'] },
    });

    expect(result.events[0]).toEqual(
      expect.objectContaining({
        signal_rule_uuids: ['rule-off-topic'],
        unresolved_rule_uuids: [],
        signal_counts: {
          total: 1,
          confirms: 0,
          refutes: 0,
          off_topic: 1,
          inconclusive: 0,
          not_checked: 0,
        },
      })
    );
  });

  it('returns bounded, deterministically ordered pages for one known event', async () => {
    const signals = Array.from({ length: 12 }, (_, index) => ({
      ...event.signals[1],
      verdict: index === 11 ? 'confirms' : 'refutes',
      collected_at: `2026-07-${String(index + 1).padStart(2, '0')}T08:00:00.000Z`,
      metadata: { rule_uuid: `rule-${index}`, rule_name: `Rule ${index}` },
    }));
    const eventClient = makeClient([{ ...event, signals }]);

    const result = await searchEventsToolHandler({
      eventClient: eventClient as never,
      params: {
        view: 'full',
        event_ids: ['checkout-failure'],
        page: 2,
        signals_page: 1,
        signals_per_page: 10,
      },
    });

    expect(eventClient.findLatestByCurrentStatePaginated).toHaveBeenCalledWith(
      expect.objectContaining({ eventIds: ['checkout-failure'], page: 1, perPage: 1 })
    );
    expect(result.events[0]).toEqual(
      expect.objectContaining({
        signals_total: 12,
        signals_page: 1,
        signals_per_page: 10,
        signals_has_more: true,
      })
    );
    expect(result.events[0].signals).toHaveLength(10);
    expect(result.events[0].signals[0]).toEqual(
      expect.objectContaining({ rule_uuid: 'rule-11', verdict: 'confirms' })
    );
  });

  it('returns the final signal page without unrelated events', async () => {
    const eventClient = makeClient([
      {
        ...event,
        signals: Array.from({ length: 12 }, (_, index) => ({
          ...event.signals[1],
          metadata: { rule_uuid: `rule-${index}`, rule_name: `Rule ${index}` },
        })),
      },
    ]);

    const result = await searchEventsToolHandler({
      eventClient: eventClient as never,
      params: {
        view: 'full',
        event_ids: ['checkout-failure'],
        signals_page: 2,
        signals_per_page: 10,
      },
    });

    expect(result.events).toHaveLength(1);
    expect(result.events[0]).toEqual(
      expect.objectContaining({ signals_page: 2, signals_has_more: false })
    );
    expect(result.events[0].signals).toHaveLength(2);
  });

  it('rejects full search without exactly one event ID', async () => {
    await expect(
      searchEventsToolHandler({ eventClient: makeClient() as never, params: { view: 'full' } })
    ).rejects.toThrow('Full event search requires exactly one event ID');
  });

  it('leaves max-length full-view signal descriptions unchanged', async () => {
    const description = 'x'.repeat(MAX_SIGNAL_DESCRIPTION_LENGTH);
    const result = await searchEventsToolHandler({
      eventClient: makeClient([
        {
          ...event,
          signals: [{ ...event.signals[0], description }],
        },
      ]) as never,
      params: { view: 'full', event_ids: ['checkout-failure'] },
    });

    expect(result.events[0].signals[0].description).toBe(description);
  });

  it('truncates oversized full-view signal descriptions', async () => {
    const description = 'x'.repeat(MAX_SIGNAL_DESCRIPTION_LENGTH + 1);
    const result = await searchEventsToolHandler({
      eventClient: makeClient([
        {
          ...event,
          signals: [{ ...event.signals[0], description }],
        },
      ]) as never,
      params: { view: 'full', event_ids: ['checkout-failure'] },
    });

    expect(result.events[0].signals[0].description).toBe(
      `${description.slice(0, DESCRIPTION_CONTENT_LENGTH)}${DESCRIPTION_TRUNCATION_SUFFIX}`
    );
  });
});
