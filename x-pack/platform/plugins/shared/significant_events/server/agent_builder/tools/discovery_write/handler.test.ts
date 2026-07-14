/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiscoveryWriteInput } from './handler';
import { discoveryWriteHandler, generateEventId, mergeSignalsLatestPerRule } from './handler';
import type { SignalEntry } from '@kbn/significant-events-schema';

const baseInput: DiscoveryWriteInput = {
  kind: 'discovery',
  title: 'Checkout latency',
  summary: 'P99 latency breached SLO',
  stream_names: ['logs.checkout'],
  severity: 'high' as const,
  confidence: 0.8,
  signals: [],
};

const createSignal = (
  ruleUuid: string,
  extra: Partial<Extract<SignalEntry, { type: 'detection' }>['metadata']> = {}
): Extract<SignalEntry, { type: 'detection' }> => ({
  type: 'detection' as const,
  description: `Testing: ${ruleUuid} rule fired.`,
  metadata: {
    rule_uuid: ruleUuid,
    rule_name: ruleUuid,
    change_point_type: 'spike',
    p_value: 0.01,
    ...extra,
  },
});

const signalsByRule = (
  signals: SignalEntry[]
): Record<string, Extract<SignalEntry, { type: 'detection' }>> =>
  Object.fromEntries(
    signals
      .filter((s): s is Extract<SignalEntry, { type: 'detection' }> => s.type === 'detection')
      .filter((s) => s.metadata.rule_uuid)
      .map((s) => [s.metadata.rule_uuid!, s])
  );

describe('generateEventId', () => {
  it('is deterministic for the same stream names and rule uuids', () => {
    const a = generateEventId(['logs.checkout'], ['rule-uuid-1']);
    const b = generateEventId(['logs.checkout'], ['rule-uuid-1']);
    expect(a).toBe(b);
  });

  it('is independent of rule uuid order', () => {
    const a = generateEventId(['logs.checkout'], ['rule-uuid-1', 'rule-uuid-2']);
    const b = generateEventId(['logs.checkout'], ['rule-uuid-2', 'rule-uuid-1']);
    expect(a).toBe(b);
  });

  it('differs when the rule uuids differ', () => {
    expect(generateEventId(['logs.checkout'], ['rule-uuid-1'])).not.toBe(
      generateEventId(['logs.checkout'], ['rule-uuid-2'])
    );
  });

  it('differs when the stream names differ', () => {
    expect(generateEventId(['logs.checkout'], ['rule-uuid-1'])).not.toBe(
      generateEventId(['logs.payments'], ['rule-uuid-1'])
    );
  });

  it('falls back to "unknown" stream when stream_names is empty', () => {
    expect(generateEventId([], ['rule-uuid-1'])).toBe(
      generateEventId(['unknown'], ['rule-uuid-1'])
    );
  });
});

describe('discoveryWriteHandler', () => {
  it('writes a new discovery with a deterministically generated event_id', async () => {
    const discoveryClient = {
      findByEventId: jest.fn().mockResolvedValue({ hits: [] }),
      bulkCreate: jest.fn().mockResolvedValue(undefined),
    };

    const result = await discoveryWriteHandler({
      discoveryClient: discoveryClient as never,
      input: baseInput,
    });

    expect(discoveryClient.bulkCreate).toHaveBeenCalledTimes(1);
    expect(result.written).toBe(true);
    expect(result.event_id).toBe(generateEventId(baseInput.stream_names, []));
  });

  it('uses the provided event_id verbatim', async () => {
    const discoveryClient = {
      findByEventId: jest.fn().mockResolvedValue({ hits: [] }),
      bulkCreate: jest.fn().mockResolvedValue(undefined),
    };

    const result = await discoveryWriteHandler({
      discoveryClient: discoveryClient as never,
      input: { ...baseInput, event_id: 'checkout-write-api-connection-refused' },
    });

    expect(result.event_id).toBe('checkout-write-api-connection-refused');
  });

  it('derives event_id from detection rule uuids in signals', async () => {
    const discoveryClient = {
      findByEventId: jest.fn().mockResolvedValue({ hits: [] }),
      bulkCreate: jest.fn().mockResolvedValue(undefined),
    };

    const signals = [createSignal('rule-uuid-1')];

    const result = await discoveryWriteHandler({
      discoveryClient: discoveryClient as never,
      input: { ...baseInput, signals },
    });

    expect(result.event_id).toBe(generateEventId(baseInput.stream_names, ['rule-uuid-1']));
  });

  it('skips write when a non-handled duplicate exists within the dedup window', async () => {
    const autoEventId = generateEventId(baseInput.stream_names, []);
    const discoveryClient = {
      findByEventId: jest.fn().mockResolvedValue({
        hits: [
          {
            discovery_id: 'existing-disc-id',
            event_id: autoEventId,
            kind: 'discovery',
            '@timestamp': new Date().toISOString(),
          },
        ],
      }),
      bulkCreate: jest.fn(),
    };

    // No explicit event_id — auto-generated, dedup applies
    const result = await discoveryWriteHandler({
      discoveryClient: discoveryClient as never,
      input: { ...baseInput, dedup_window: 'now-1h' },
    });

    expect(discoveryClient.bulkCreate).not.toHaveBeenCalled();
    expect(result.written).toBe(false);
    expect(result.skipped).toBe(true);
    expect(result.reason).toBe('duplicate_within_window');
    expect(result.existing_discovery_id).toBe('existing-disc-id');
  });

  it('does not skip when the existing hit is outside the dedup window', async () => {
    const discoveryClient = {
      findByEventId: jest.fn().mockResolvedValue({
        hits: [
          {
            discovery_id: 'existing-disc-id',
            kind: 'discovery',
            '@timestamp': new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          },
        ],
      }),
      bulkCreate: jest.fn().mockResolvedValue(undefined),
    };

    // No explicit event_id — auto-generated, dedup applies but existing hit is outside the window
    const result = await discoveryWriteHandler({
      discoveryClient: discoveryClient as never,
      input: { ...baseInput, dedup_window: 'now-1h' },
    });

    expect(discoveryClient.bulkCreate).toHaveBeenCalledTimes(1);
    expect(result.written).toBe(true);
  });

  it('skips dedup entirely for continuation writes (explicit event_id)', async () => {
    const discoveryClient = {
      // findByEventId only called for signal merging, never for dedup
      findByEventId: jest.fn().mockResolvedValue({ hits: [] }),
      bulkCreate: jest.fn().mockResolvedValue(undefined),
    };

    const result = await discoveryWriteHandler({
      discoveryClient: discoveryClient as never,
      input: {
        ...baseInput,
        event_id: 'checkout-event-id',
        dedup_window: 'now-1h',
      },
    });

    // dedup skipped; findByEventId called once for signal merging only
    expect(discoveryClient.findByEventId).toHaveBeenCalledTimes(1);
    expect(discoveryClient.bulkCreate).toHaveBeenCalledTimes(1);
    expect(result.written).toBe(true);
    expect(result.event_id).toBe('checkout-event-id');
  });

  it('skips dedup for clearance writes', async () => {
    const discoveryClient = {
      findByEventId: jest.fn(),
      bulkCreate: jest.fn().mockResolvedValue(undefined),
    };

    const result = await discoveryWriteHandler({
      discoveryClient: discoveryClient as never,
      input: {
        ...baseInput,
        kind: 'clearance',
        previous_discovery_id: 'prior-disc-id',
        dedup_window: 'now-1h',
      },
    });

    expect(discoveryClient.findByEventId).not.toHaveBeenCalled();
    expect(discoveryClient.bulkCreate).toHaveBeenCalledTimes(1);
    expect(result.written).toBe(true);
    expect(result.kind).toBe('clearance');
  });

  it('does not skip when no matching discovery exists within the dedup window', async () => {
    const discoveryClient = {
      findByEventId: jest.fn().mockResolvedValue({ hits: [] }),
      bulkCreate: jest.fn().mockResolvedValue(undefined),
    };

    const result = await discoveryWriteHandler({
      discoveryClient: discoveryClient as never,
      input: { ...baseInput, dedup_window: 'now-1h' },
    });

    expect(discoveryClient.findByEventId).toHaveBeenCalled();
    expect(discoveryClient.bulkCreate).toHaveBeenCalledTimes(1);
    expect(result.written).toBe(true);
  });

  it('skips dedup when dedup_window is unrecognised', async () => {
    const discoveryClient = {
      // findByEventId is still called for signal merging when event_id is explicit
      findByEventId: jest.fn().mockResolvedValue({ hits: [] }),
      bulkCreate: jest.fn().mockResolvedValue(undefined),
    };

    const result = await discoveryWriteHandler({
      discoveryClient: discoveryClient as never,
      input: { ...baseInput, event_id: 'checkout-event-id', dedup_window: 'invalid' },
    });

    // dedup is skipped (invalid window), write proceeds; findByEventId called once for signal merging only
    expect(discoveryClient.findByEventId).toHaveBeenCalledTimes(1);
    expect(discoveryClient.bulkCreate).toHaveBeenCalledTimes(1);
    expect(result.written).toBe(true);
  });

  it('skips dedup check for kind:handled', async () => {
    const discoveryClient = {
      findByEventId: jest.fn(),
      bulkCreate: jest.fn().mockResolvedValue(undefined),
    };

    await discoveryWriteHandler({
      discoveryClient: discoveryClient as never,
      input: {
        ...baseInput,
        kind: 'handled',
        event_id: 'checkout-event-id',
        dedup_window: 'now-1h',
      },
    });

    expect(discoveryClient.findByEventId).not.toHaveBeenCalled();
    expect(discoveryClient.bulkCreate).toHaveBeenCalledTimes(1);
  });

  it('generates a discovery_id when omitted, and reuses one when provided', async () => {
    const discoveryClient = {
      findByEventId: jest.fn().mockResolvedValue({ hits: [] }),
      bulkCreate: jest.fn().mockResolvedValue(undefined),
    };

    const generated = await discoveryWriteHandler({
      discoveryClient: discoveryClient as never,
      input: baseInput,
    });
    expect(generated.discovery_id).toHaveLength(36);

    const provided = await discoveryWriteHandler({
      discoveryClient: discoveryClient as never,
      input: { ...baseInput, discovery_id: 'explicit-discovery-id' },
    });
    expect(provided.discovery_id).toBe('explicit-discovery-id');
  });

  it('sets processed only for kind:handled', async () => {
    const discoveryClient = {
      findByEventId: jest.fn().mockResolvedValue({ hits: [] }),
      bulkCreate: jest.fn().mockResolvedValue(undefined),
    };

    await discoveryWriteHandler({
      discoveryClient: discoveryClient as never,
      input: { ...baseInput, kind: 'handled', event_id: 'checkout-event-id' },
    });

    const [[documents]] = discoveryClient.bulkCreate.mock.calls;
    expect(documents[0].processed).toBe(true);
    expect(documents[0].discovered_at).toBeUndefined();
  });

  it('sets discovered_at only for kind:discovery', async () => {
    const discoveryClient = {
      findByEventId: jest.fn().mockResolvedValue({ hits: [] }),
      bulkCreate: jest.fn().mockResolvedValue(undefined),
    };

    await discoveryWriteHandler({
      discoveryClient: discoveryClient as never,
      input: baseInput,
    });

    const [[documents]] = discoveryClient.bulkCreate.mock.calls;
    expect(documents[0].discovered_at).toBeDefined();
    expect(documents[0].processed).toBe(false);
  });
});

describe('mergeSignalsLatestPerRule', () => {
  it('keeps the submitted signal for an overlapping rule_uuid (latest wins)', () => {
    const prior = [
      {
        '@timestamp': 't1',
        signals: [createSignal('ruleA'), createSignal('ruleB', { change_point_type: 'spike' })],
      },
    ];
    const submitted = [createSignal('ruleB', { change_point_type: 'dip' })];
    const map = signalsByRule(mergeSignalsLatestPerRule(prior, submitted, 't2'));
    expect(Object.keys(map).sort()).toEqual(['ruleA', 'ruleB']);
    expect(map.ruleB.metadata.change_point_type).toBe('dip'); // submitted (t2 > t1) wins
    expect(map.ruleA.metadata.change_point_type).toBe('spike'); // prior-only rule retained
  });

  it('returns the submitted set unchanged when there are no prior docs', () => {
    const merged = mergeSignalsLatestPerRule([], [createSignal('ruleA')], 't2');
    expect(merged).toHaveLength(1);
    expect(signalsByRule(merged).ruleA).toBeDefined();
  });

  it('takes the newest prior doc for a rule present in multiple cycles', () => {
    const prior = [
      {
        '@timestamp': 't2',
        signals: [createSignal('ruleA', { change_point_type: 'dip' })],
      },
      {
        '@timestamp': 't1',
        signals: [createSignal('ruleA', { change_point_type: 'spike' })],
      },
    ];
    // submitted is older than both priors, so the newest prior (t2) must win.
    const map = signalsByRule(mergeSignalsLatestPerRule(prior, [], 't0'));
    expect(map.ruleA.metadata.change_point_type).toBe('dip');
  });

  it('resolves an equal-timestamp tie in favour of the submitted set', () => {
    const prior = [
      {
        '@timestamp': 't1',
        signals: [createSignal('ruleA', { change_point_type: 'spike' })],
      },
    ];
    const submitted = [createSignal('ruleA', { change_point_type: 'dip' })];
    const map = signalsByRule(mergeSignalsLatestPerRule(prior, submitted, 't1'));
    expect(map.ruleA.metadata.change_point_type).toBe('dip');
  });
});

describe('discoveryWriteHandler — continuation snapshot merge', () => {
  it('persists the full episode signal set (prior event_id docs ∪ submitted, latest per rule)', async () => {
    const discoveryClient = {
      findByEventId: jest.fn().mockResolvedValue({
        hits: [
          {
            '@timestamp': '2026-01-01T00:00:00.000Z',
            signals: [createSignal('ruleA')],
          },
          {
            '@timestamp': '2026-01-02T00:00:00.000Z',
            signals: [createSignal('ruleB', { change_point_type: 'spike' })],
          },
        ],
      }),
      bulkCreate: jest.fn().mockResolvedValue(undefined),
    };

    await discoveryWriteHandler({
      discoveryClient: discoveryClient as never,
      input: {
        ...baseInput,
        event_id: 'otel__x-abc12345',
        signals: [createSignal('ruleB', { change_point_type: 'dip' })],
      },
    });

    expect(discoveryClient.findByEventId).toHaveBeenCalledWith('otel__x-abc12345');
    const persisted: SignalEntry[] = discoveryClient.bulkCreate.mock.calls[0][0][0].signals;
    expect(Object.keys(signalsByRule(persisted)).sort()).toEqual(['ruleA', 'ruleB']); // ruleA carried forward
  });

  it('does not merge or fetch prior docs for a handled marker write', async () => {
    const discoveryClient = {
      findByEventId: jest.fn(),
      bulkCreate: jest.fn().mockResolvedValue(undefined),
    };

    await discoveryWriteHandler({
      discoveryClient: discoveryClient as never,
      input: {
        ...baseInput,
        kind: 'handled',
        event_id: 'otel__x-abc12345',
        previous_discovery_id: 'source-discovery-id',
        signals: [],
      },
    });

    expect(discoveryClient.findByEventId).not.toHaveBeenCalled();
    expect(discoveryClient.bulkCreate.mock.calls[0][0][0].signals).toEqual([]);
    expect(discoveryClient.bulkCreate.mock.calls[0][0][0].previous_discovery_id).toBe(
      'source-discovery-id'
    );
  });

  it('does not fetch prior docs for a new-episode (auto event_id) write', async () => {
    const discoveryClient = {
      findByEventId: jest.fn().mockResolvedValue({ hits: [] }),
      bulkCreate: jest.fn().mockResolvedValue(undefined),
    };

    await discoveryWriteHandler({
      discoveryClient: discoveryClient as never,
      input: { ...baseInput, signals: [createSignal('ruleA')] },
    });

    // findByEventId is called for dedup check (no dedup_window here → skipped), but not for merging
    expect(discoveryClient.findByEventId).not.toHaveBeenCalled();
  });
});
