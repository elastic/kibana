/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { searchEventsToolHandler } from './handler';

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
        stream_name: 'logs.checkout',
        confirmed: true,
        description: 'Payment call failed',
        collected_at: '2026-07-20T08:00:00.000Z',
        metadata: { rule_uuid: 'rule-uuid-1', rule_name: 'Payment failures' },
        evidence: { result: 'found', esql_query: 'FROM logs.checkout' },
      },
    ],
    causal_features: [{ feature_id: 'checkout-payment', name: 'Checkout to payment' }],
    blast_radius: [{ feature_id: 'checkout-payment', type: 'dependency' }],
    assessment_note: 'Verbose judge assessment',
  };

  const makeClient = (hits: object[] = [event], total = hits.length) => ({
    findLatestByCurrentStatePaginated: jest
      .fn()
      .mockResolvedValue({ hits, page: 1, perPage: 20, total }),
    findLatestPaginated: jest.fn().mockResolvedValue({ hits, page: 1, perPage: 20, total }),
  });

  it('maps params and returns events for state-scoped search', async () => {
    const eventClient = makeClient();

    const result = await searchEventsToolHandler({
      eventClient: eventClient as never,
      params: {
        query: 'timeout',
        stream_names: ['logs.checkout'],
        rule_uuids: ['rule-uuid-1'],
        status: 'open',
        page: 2,
      },
    });

    expect(eventClient.findLatestByCurrentStatePaginated).toHaveBeenCalledWith({
      page: 2,
      perPage: 20,
      eventIds: undefined,
      ruleUuids: ['rule-uuid-1'],
      topologyFeatureIds: undefined,
      search: 'timeout',
      stream: ['logs.checkout'],
      status: ['open'],
      from: 'now-7d',
      to: 'now',
    });
    expect(eventClient.findLatestPaginated).not.toHaveBeenCalled();
    expect(result).toEqual({
      events: [
        {
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
              stream_name: 'logs.checkout',
              rule_uuid: 'rule-uuid-1',
              rule_name: 'Payment failures',
              confirmed: true,
              description: 'Payment call failed',
              collected_at: '2026-07-20T08:00:00.000Z',
              esql_query: 'FROM logs.checkout',
            },
          ],
          total_signals: 1,
          signals_truncated: false,
          causal_features: [{ feature_id: 'checkout-payment', name: 'Checkout to payment' }],
          blast_radius: [{ feature_id: 'checkout-payment', type: 'dependency' }],
        },
      ],
      view: 'compact',
      page: 1,
      per_page: 20,
      returned: 1,
      total: 1,
      has_more: false,
      next_page: null,
    });
  });

  it('excludes confirmed false signals when requested', async () => {
    const eventClient = makeClient([
      {
        ...event,
        signals: [
          ...event.signals,
          {
            ...event.signals[0],
            confirmed: false,
            metadata: { rule_uuid: 'rule-uuid-rejected', rule_name: 'Rejected rule' },
          },
        ],
      },
    ]);

    const result = await searchEventsToolHandler({
      eventClient: eventClient as never,
      params: {
        status: 'open',
        exclude_unconfirmed_signals: true,
        view: 'compact',
      },
    });

    expect(result.events[0].signals).toEqual([
      expect.objectContaining({
        collected_at: '2026-07-20T08:00:00.000Z',
        confirmed: true,
        description: 'Payment call failed',
        esql_query: 'FROM logs.checkout',
        rule_name: 'Payment failures',
        rule_uuid: 'rule-uuid-1',
        stream_name: 'logs.checkout',
      }),
    ]);
  });

  it('preserves an event when its only requested rule match is unconfirmed', async () => {
    // Keep the requested rule identity visible so discovery can reconcile an existing
    // open episode to closed after a current recovery check. Other unconfirmed signals
    // remain excluded.
    const eventWithOnlyUnconfirmedMatch = {
      ...event,
      signals: [
        {
          stream_name: 'logs.checkout',
          confirmed: false,
          description: 'Unconfirmed signal',
          collected_at: '2026-07-20T08:00:00.000Z',
          metadata: { rule_uuid: 'unconfirmed-rule-uuid', rule_name: 'Unconfirmed rule' },
          evidence: { result: 'found', esql_query: 'FROM logs.checkout' },
        },
      ],
    };
    const eventClient = makeClient([eventWithOnlyUnconfirmedMatch]);

    const result = await searchEventsToolHandler({
      eventClient: eventClient as never,
      params: {
        rule_uuids: ['unconfirmed-rule-uuid'],
        exclude_unconfirmed_signals: true,
      },
    });

    expect(result.events).toHaveLength(1);
    expect(result.returned).toBe(1);
    expect(result.events[0].signals).toEqual([
      expect.objectContaining({
        rule_uuid: 'unconfirmed-rule-uuid',
        confirmed: false,
      }),
    ]);
  });

  it('preserves a requested unconfirmed rule alongside confirmed event signals', async () => {
    const eventWithMixedSignals = {
      ...event,
      signals: [
        ...event.signals,
        {
          stream_name: 'logs.checkout',
          confirmed: false,
          description: 'Unconfirmed recovery signal',
          collected_at: '2026-07-20T08:00:00.000Z',
          metadata: {
            rule_uuid: 'unconfirmed-rule-uuid',
            rule_name: 'Unconfirmed rule',
          },
          evidence: { result: 'found', esql_query: 'FROM logs.checkout' },
        },
      ],
    };
    const eventClient = makeClient([eventWithMixedSignals]);

    const result = await searchEventsToolHandler({
      eventClient: eventClient as never,
      params: {
        rule_uuids: ['unconfirmed-rule-uuid'],
        exclude_unconfirmed_signals: true,
      },
    });

    expect(result.events).toHaveLength(1);
    expect(result.events[0].signals).toEqual([
      expect.objectContaining({ rule_uuid: 'rule-uuid-1', confirmed: true }),
      expect.objectContaining({ rule_uuid: 'unconfirmed-rule-uuid', confirmed: false }),
    ]);
  });

  it('caps compact signals to the most recent entries', async () => {
    const manySignals = Array.from({ length: 16 }, (_, i) => ({
      stream_name: 'logs.checkout',
      confirmed: true,
      description: `Testing rule ${i}. Verdict: confirms.`,
      collected_at: `2026-07-20T0${i % 10}:00:00.000Z`,
      metadata: { rule_uuid: `rule-uuid-${i}`, rule_name: `Rule ${i}` },
      evidence: { result: 'found', esql_query: 'FROM logs.checkout' },
    }));
    const eventClient = makeClient([{ ...event, signals: manySignals }]);

    const result = await searchEventsToolHandler({
      eventClient: eventClient as never,
      params: { view: 'compact' },
    });

    expect(result.events[0].signals).toHaveLength(10);
    expect(result.events[0].signals.map((signal) => signal.rule_uuid)).toEqual([
      'rule-uuid-9',
      'rule-uuid-8',
      'rule-uuid-7',
      'rule-uuid-6',
      'rule-uuid-5',
      'rule-uuid-15',
      'rule-uuid-4',
      'rule-uuid-14',
      'rule-uuid-3',
      'rule-uuid-13',
    ]);
    expect(result.events[0].total_signals).toBe(16);
    expect(result.events[0].signals_truncated).toBe(true);
  });

  it('never truncates away a fresh unconfirmed signal in favor of old confirmed ones', async () => {
    const oldConfirmedSignals = Array.from({ length: 15 }, (_, i) => ({
      stream_name: 'logs.checkout',
      confirmed: true,
      description: `Old confirmed rule ${i}`,
      collected_at: `2026-07-0${(i % 9) + 1}T08:00:00.000Z`,
      metadata: { rule_uuid: `old-rule-uuid-${i}`, rule_name: `Old rule ${i}` },
      evidence: { result: 'found', esql_query: 'FROM logs.checkout' },
    }));
    const freshUnconfirmedSignal = {
      stream_name: 'logs.checkout',
      confirmed: false,
      description: 'Fresh rule needing this-cycle verification',
      collected_at: '2026-07-20T08:00:00.000Z',
      metadata: { rule_uuid: 'fresh-rule-uuid', rule_name: 'Fresh rule' },
      evidence: { result: 'found', esql_query: 'FROM logs.checkout' },
    };
    const eventClient = makeClient([
      { ...event, signals: [...oldConfirmedSignals, freshUnconfirmedSignal] },
    ]);

    const result = await searchEventsToolHandler({
      eventClient: eventClient as never,
      params: { view: 'compact' },
    });

    expect(result.events[0].signals).toHaveLength(10);
    expect(result.events[0].signals[0]).toEqual(
      expect.objectContaining({ rule_uuid: 'fresh-rule-uuid', confirmed: false })
    );
  });

  it('never truncates away a signal matching the search rule_uuids filter', async () => {
    const recentSignals = Array.from({ length: 10 }, (_, i) => ({
      stream_name: 'logs.checkout',
      confirmed: true,
      description: `Recent rule ${i}`,
      collected_at: `2026-07-2${i}T08:00:00.000Z`,
      metadata: { rule_uuid: `recent-rule-uuid-${i}`, rule_name: `Recent rule ${i}` },
      evidence: { result: 'found', esql_query: 'FROM logs.checkout' },
    }));
    const requestedOldSignal = {
      stream_name: 'logs.checkout',
      confirmed: true,
      description: 'Requested old rule',
      collected_at: '2026-01-01T08:00:00.000Z',
      metadata: { rule_uuid: 'requested-rule-uuid', rule_name: 'Requested rule' },
      evidence: { result: 'found', esql_query: 'FROM logs.checkout' },
    };
    const eventClient = makeClient([{ ...event, signals: [...recentSignals, requestedOldSignal] }]);

    const result = await searchEventsToolHandler({
      eventClient: eventClient as never,
      params: { view: 'compact', rule_uuids: ['requested-rule-uuid'] },
    });

    expect(result.events[0].signals).toHaveLength(10);
    expect(result.events[0].signals[0]).toEqual(
      expect.objectContaining({ rule_uuid: 'requested-rule-uuid' })
    );
  });

  it('never truncates away a signal matching the search stream_names filter', async () => {
    const recentSignals = Array.from({ length: 10 }, (_, i) => ({
      stream_name: 'logs.checkout',
      confirmed: true,
      description: `Recent rule ${i}`,
      collected_at: `2026-07-2${i}T08:00:00.000Z`,
      metadata: { rule_uuid: `recent-rule-uuid-${i}`, rule_name: `Recent rule ${i}` },
      evidence: { result: 'found', esql_query: 'FROM logs.checkout' },
    }));
    const requestedOldSignal = {
      stream_name: 'logs.requested-stream',
      confirmed: true,
      description: 'Requested old rule',
      collected_at: '2026-01-01T08:00:00.000Z',
      metadata: { rule_uuid: 'other-rule-uuid', rule_name: 'Other rule' },
      evidence: { result: 'found', esql_query: 'FROM logs.checkout' },
    };
    const eventClient = makeClient([{ ...event, signals: [...recentSignals, requestedOldSignal] }]);

    const result = await searchEventsToolHandler({
      eventClient: eventClient as never,
      params: { view: 'compact', stream_names: ['logs.requested-stream'] },
    });

    expect(result.events[0].signals).toHaveLength(10);
    expect(result.events[0].signals[0]).toEqual(
      expect.objectContaining({ stream_name: 'logs.requested-stream' })
    );
  });

  it('omits a whitespace-only query', async () => {
    const eventClient = makeClient();

    await searchEventsToolHandler({
      eventClient: eventClient as never,
      params: { query: '   ' },
    });

    expect(eventClient.findLatestPaginated).toHaveBeenCalledWith(
      expect.objectContaining({ search: undefined })
    );
  });

  it('supports cross-stream state search when stream_names is omitted', async () => {
    const eventClient = makeClient();

    await searchEventsToolHandler({
      eventClient: eventClient as never,
      params: { status: 'closed' },
    });

    expect(eventClient.findLatestByCurrentStatePaginated).toHaveBeenCalledWith({
      page: 1,
      perPage: 20,
      eventIds: undefined,
      ruleUuids: undefined,
      topologyFeatureIds: undefined,
      search: undefined,
      stream: undefined,
      status: ['closed'],
      from: 'now-7d',
      to: 'now',
    });
  });

  it('falls back to findLatestPaginated when state is omitted', async () => {
    const eventClient = makeClient();

    await searchEventsToolHandler({
      eventClient: eventClient as never,
      params: {
        stream_names: ['logs.checkout', 'logs.payment', 'logs.otel'],
      },
    });

    expect(eventClient.findLatestPaginated).toHaveBeenCalledWith(
      expect.objectContaining({
        stream: ['logs.checkout', 'logs.payment', 'logs.otel'],
        from: 'now-7d',
        to: 'now',
      })
    );
    expect(eventClient.findLatestByCurrentStatePaginated).not.toHaveBeenCalled();
  });

  it('applies rule and event ID filters even when status is omitted', async () => {
    const eventClient = makeClient();

    await searchEventsToolHandler({
      eventClient: eventClient as never,
      params: {
        rule_uuids: ['rule-uuid-1'],
        event_ids: ['checkout-failure'],
      },
    });

    expect(eventClient.findLatestByCurrentStatePaginated).toHaveBeenCalledWith(
      expect.objectContaining({
        eventIds: ['checkout-failure'],
        ruleUuids: ['rule-uuid-1'],
        status: undefined,
      })
    );
    expect(eventClient.findLatestPaginated).not.toHaveBeenCalled();
  });

  it('applies topology feature filters even when status is omitted', async () => {
    const eventClient = makeClient();

    await searchEventsToolHandler({
      eventClient: eventClient as never,
      params: {
        topology_feature_ids: ['checkout-payment', 'payments-database'],
      },
    });

    expect(eventClient.findLatestByCurrentStatePaginated).toHaveBeenCalledWith(
      expect.objectContaining({
        topologyFeatureIds: ['checkout-payment', 'payments-database'],
      })
    );
    expect(eventClient.findLatestPaginated).not.toHaveBeenCalled();
  });

  it('preserves null topology fields in compact results', async () => {
    const eventClient = makeClient([{ ...event, causal_features: null, blast_radius: null }]);

    const result = await searchEventsToolHandler({
      eventClient: eventClient as never,
      params: { view: 'compact' },
    });

    expect(result.events[0]).toEqual(
      expect.objectContaining({
        causal_features: null,
        blast_radius: null,
      })
    );
  });

  it('returns full events with a 10-event page cap and pagination metadata', async () => {
    const eventClient = makeClient([event], 25);
    eventClient.findLatestPaginated.mockResolvedValue({
      hits: [event],
      page: 2,
      perPage: 10,
      total: 25,
    });

    const result = await searchEventsToolHandler({
      eventClient: eventClient as never,
      params: { view: 'full', per_page: 20, page: 2 },
    });

    expect(eventClient.findLatestPaginated).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2, perPage: 10 })
    );
    expect(result).toEqual({
      events: [event],
      view: 'full',
      page: 2,
      per_page: 10,
      returned: 1,
      total: 25,
      has_more: true,
      next_page: 3,
    });
  });

  it('returns compact pagination metadata for later pages', async () => {
    const eventClient = makeClient([event], 25);
    eventClient.findLatestPaginated.mockResolvedValue({
      hits: [event],
      page: 2,
      perPage: 20,
      total: 25,
    });

    const result = await searchEventsToolHandler({
      eventClient: eventClient as never,
      params: { view: 'compact', per_page: 20, page: 2 },
    });

    expect(result).toEqual(
      expect.objectContaining({
        view: 'compact',
        page: 2,
        per_page: 20,
        returned: 1,
        total: 25,
        has_more: false,
        next_page: null,
      })
    );
  });
});
