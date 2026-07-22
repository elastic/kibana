/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiscoveryWriteInput } from './handler';
import {
  discoveryWriteHandler,
  generateEventId,
  makeFingerprint,
  mergeSignalsLatestPerRule,
} from './handler';
import type { SignalEntry } from '@kbn/significant-events-schema';

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('12345678'),
}));

const baseInput: DiscoveryWriteInput = {
  kind: 'discovery',
  title: 'Checkout latency',
  symptom_hypothesis: 'Checkout requests are delayed because the payment dependency is timing out.',
  summary: 'P99 latency breached SLO',
  stream_names: ['logs.checkout'],
  severity: '60-high',
  confidence: 0.8,
  signals: [],
};

const createSignal = (
  ruleUuid: string,
  extra: Partial<Extract<SignalEntry, { type: 'detection' }>['metadata']> = {}
): Extract<SignalEntry, { type: 'detection' }> => ({
  type: 'detection' as const,
  description: `Testing: ${ruleUuid} rule fired.`,
  confirmed: true,
  stream_name: 'logs.checkout',
  metadata: {
    detection_id: 'detection-1',
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

describe('discoveryWriteHandler', () => {
  it('writes a new discovery and returns event_id', async () => {
    const discoveryClient = {
      findByEventId: jest.fn().mockResolvedValue({ hits: [] }),
      bulkCreate: jest.fn().mockResolvedValue(undefined),
    };

    const result = await discoveryWriteHandler({
      discoveryClient: discoveryClient as never,
      input: baseInput,
    });

    expect(discoveryClient.bulkCreate).toHaveBeenCalledTimes(1);
    expect(discoveryClient.bulkCreate.mock.calls[0][0][0].symptom_hypothesis).toBe(
      baseInput.symptom_hypothesis
    );
    expect(result.written).toBe(true);
    expect(result.event_id).toBeDefined();
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

  it('skips write when a matching active discovery exists within the dedup window', async () => {
    const activeDoc = {
      discovery_id: 'existing-disc-id',
      event_id: 'some-event-id',
      kind: 'discovery' as const,
      stream_names: baseInput.stream_names,
      signals: [],
      '@timestamp': new Date().toISOString(),
    };
    const discoveryClient = {
      findLatest: jest.fn().mockResolvedValue({ hits: [activeDoc] }),
      findByEventId: jest.fn().mockResolvedValue({ hits: [] }),
      bulkCreate: jest.fn(),
    };

    const result = await discoveryWriteHandler({
      discoveryClient: discoveryClient as never,
      input: { ...baseInput, dedup_window: 'now-1h' },
    });

    expect(discoveryClient.findLatest).toHaveBeenCalledWith({ from: expect.any(String) });
    expect(discoveryClient.bulkCreate).not.toHaveBeenCalled();
    expect(result.written).toBe(false);
    expect(result.skipped).toBe(true);
    expect(result.reason).toBe('duplicate_within_window');
    expect(result.existing_discovery_id).toBe('existing-disc-id');
  });

  it('deduplicates discoveries with multivalued stream_names', async () => {
    const streamNames = ['logs.checkout', 'logs.payment'];
    const activeDoc = {
      discovery_id: 'existing-multi-stream-disc-id',
      event_id: 'existing-multi-stream-event-id',
      kind: 'discovery' as const,
      stream_names: [...streamNames].reverse(),
      signals: [],
      '@timestamp': new Date().toISOString(),
    };
    const discoveryClient = {
      findLatest: jest.fn().mockResolvedValue({ hits: [activeDoc] }),
      findByEventId: jest.fn().mockResolvedValue({ hits: [] }),
      bulkCreate: jest.fn(),
    };

    const result = await discoveryWriteHandler({
      discoveryClient: discoveryClient as never,
      input: { ...baseInput, stream_names: streamNames, dedup_window: 'now-1h' },
    });

    expect(discoveryClient.findLatest).toHaveBeenCalledWith({ from: expect.any(String) });
    expect(discoveryClient.bulkCreate).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        event_id: 'existing-multi-stream-event-id',
        written: false,
        reason: 'duplicate_within_window',
      })
    );
  });

  it('does not skip when a matching discovery exists but has a different stream', async () => {
    const differentStreamDoc = {
      discovery_id: 'other-disc-id',
      kind: 'discovery' as const,
      stream_names: ['logs.other'],
      signals: [],
      '@timestamp': new Date().toISOString(),
    };
    const discoveryClient = {
      findLatest: jest.fn().mockResolvedValue({ hits: [differentStreamDoc] }),
      findByEventId: jest.fn().mockResolvedValue({ hits: [] }),
      bulkCreate: jest.fn().mockResolvedValue(undefined),
    };

    const result = await discoveryWriteHandler({
      discoveryClient: discoveryClient as never,
      input: { ...baseInput, dedup_window: 'now-1h' },
    });

    expect(discoveryClient.bulkCreate).toHaveBeenCalledTimes(1);
    expect(result.written).toBe(true);
  });

  it('does not skip when the only recent doc for the fingerprint is a clearance (resolved incident)', async () => {
    // A clearance means the incident was resolved; the next detection should be a fresh incident.
    const clearedDoc = {
      discovery_id: 'cleared-disc-id',
      kind: 'clearance' as const,
      stream_names: baseInput.stream_names,
      signals: [],
      '@timestamp': new Date().toISOString(),
    };
    const discoveryClient = {
      findLatest: jest.fn().mockResolvedValue({ hits: [clearedDoc] }),
      findByEventId: jest.fn().mockResolvedValue({ hits: [] }),
      bulkCreate: jest.fn().mockResolvedValue(undefined),
    };

    const result = await discoveryWriteHandler({
      discoveryClient: discoveryClient as never,
      input: { ...baseInput, dedup_window: 'now-1h' },
    });

    expect(discoveryClient.bulkCreate).toHaveBeenCalledTimes(1);
    expect(result.written).toBe(true);
  });

  it('skips dedup entirely for continuation writes (explicit event_id)', async () => {
    const discoveryClient = {
      // findLatest never called for dedup; findByEventId called once for signal merging
      findLatest: jest.fn(),
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

    expect(discoveryClient.findLatest).not.toHaveBeenCalled();
    expect(discoveryClient.findByEventId).toHaveBeenCalledTimes(1);
    expect(discoveryClient.bulkCreate).toHaveBeenCalledTimes(1);
    expect(result.written).toBe(true);
    expect(result.event_id).toBe('checkout-event-id');
  });

  it('skips dedup for clearance writes', async () => {
    const discoveryClient = {
      findLatest: jest.fn(),
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

    expect(discoveryClient.findLatest).not.toHaveBeenCalled();
    expect(discoveryClient.findByEventId).not.toHaveBeenCalled();
    expect(discoveryClient.bulkCreate).toHaveBeenCalledTimes(1);
    expect(result.written).toBe(true);
    expect(result.kind).toBe('clearance');
  });

  it('does not skip when no matching discovery exists within the dedup window', async () => {
    const discoveryClient = {
      findLatest: jest.fn().mockResolvedValue({ hits: [] }),
      findByEventId: jest.fn().mockResolvedValue({ hits: [] }),
      bulkCreate: jest.fn().mockResolvedValue(undefined),
    };

    const result = await discoveryWriteHandler({
      discoveryClient: discoveryClient as never,
      input: { ...baseInput, dedup_window: 'now-1h' },
    });

    expect(discoveryClient.findLatest).toHaveBeenCalled();
    expect(discoveryClient.bulkCreate).toHaveBeenCalledTimes(1);
    expect(result.written).toBe(true);
  });

  it('skips dedup when dedup_window is unrecognised', async () => {
    const discoveryClient = {
      // findLatest never called (invalid window); findByEventId called once for signal merging
      findLatest: jest.fn(),
      findByEventId: jest.fn().mockResolvedValue({ hits: [] }),
      bulkCreate: jest.fn().mockResolvedValue(undefined),
    };

    const result = await discoveryWriteHandler({
      discoveryClient: discoveryClient as never,
      input: { ...baseInput, event_id: 'checkout-event-id', dedup_window: 'invalid' },
    });

    expect(discoveryClient.findLatest).not.toHaveBeenCalled();
    expect(discoveryClient.findByEventId).toHaveBeenCalledTimes(1);
    expect(discoveryClient.bulkCreate).toHaveBeenCalledTimes(1);
    expect(result.written).toBe(true);
  });

  it('skips dedup check for kind:handled', async () => {
    const discoveryClient = {
      findLatest: jest.fn(),
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

    expect(discoveryClient.findLatest).not.toHaveBeenCalled();
    expect(discoveryClient.findByEventId).not.toHaveBeenCalled();
    expect(discoveryClient.bulkCreate).toHaveBeenCalledTimes(1);
  });

  it('generates a discovery_id for each new write', async () => {
    const discoveryClient = {
      findByEventId: jest.fn().mockResolvedValue({ hits: [] }),
      bulkCreate: jest.fn().mockResolvedValue(undefined),
    };

    const result = await discoveryWriteHandler({
      discoveryClient: discoveryClient as never,
      input: baseInput,
    });

    expect(result.discovery_id).toBeDefined();
    expect(discoveryClient.bulkCreate.mock.calls[0][0][0].discovery_id).toBe(result.discovery_id);
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
  });
});

/**
 * `generateEventId` intentionally includes a random suffix so each new incident gets a unique id
 * for grouping. Dedup uses `makeFingerprint` (deterministic, no suffix) instead of event_id.
 */
describe('generateEventId', () => {
  let mockV4: jest.Mock;

  beforeEach(() => {
    mockV4 = (jest.requireMock('uuid') as { v4: jest.Mock }).v4;
  });

  it('produces different ids for the same inputs when uuid returns different values', () => {
    mockV4.mockReturnValueOnce('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    const a = generateEventId(['logs.checkout'], ['rule-uuid-1']);

    mockV4.mockReturnValueOnce('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
    const b = generateEventId(['logs.checkout'], ['rule-uuid-1']);

    // Each new incident instance gets a distinct event_id — this is intentional.
    // Dedup is handled separately via makeFingerprint, not via event_id comparison.
    expect(a).not.toBe(b);
  });
});

describe('makeFingerprint', () => {
  it('is deterministic for the same stream names and rule uuids', () => {
    expect(makeFingerprint(['logs.checkout'], ['rule-uuid-1'])).toBe(
      makeFingerprint(['logs.checkout'], ['rule-uuid-1'])
    );
  });

  it('is independent of rule uuid order', () => {
    expect(makeFingerprint(['logs.checkout'], ['rule-uuid-1', 'rule-uuid-2'])).toBe(
      makeFingerprint(['logs.checkout'], ['rule-uuid-2', 'rule-uuid-1'])
    );
  });

  it('differs when stream names differ', () => {
    expect(makeFingerprint(['logs.checkout'], ['rule-uuid-1'])).not.toBe(
      makeFingerprint(['logs.payments'], ['rule-uuid-1'])
    );
  });

  it('differs when rule uuids differ', () => {
    expect(makeFingerprint(['logs.checkout'], ['rule-uuid-1'])).not.toBe(
      makeFingerprint(['logs.checkout'], ['rule-uuid-2'])
    );
  });

  it('falls back to "unknown" stream when stream_names is empty', () => {
    expect(makeFingerprint([], ['rule-uuid-1'])).toBe(
      makeFingerprint(['unknown'], ['rule-uuid-1'])
    );
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

  it('excludes handled prior docs from the continuation signal merge', async () => {
    const discoveryClient = {
      findByEventId: jest.fn().mockResolvedValue({
        hits: [
          {
            kind: 'discovery',
            '@timestamp': '2026-01-01T00:00:00.000Z',
            signals: [createSignal('ruleA')],
          },
          {
            kind: 'handled',
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
        signals: [createSignal('ruleC')],
      },
    });

    const persisted: SignalEntry[] = discoveryClient.bulkCreate.mock.calls[0][0][0].signals;
    expect(Object.keys(signalsByRule(persisted)).sort()).toEqual(['ruleA', 'ruleC']);
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

    // auto event_id → no merging; no dedup_window → findLatest not called either
    expect(discoveryClient.findByEventId).not.toHaveBeenCalled();
  });
});
