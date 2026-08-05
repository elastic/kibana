/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiscoveryWriteInput } from './handler';
import {
  discoveryWriteBulkHandler,
  generateEventId,
  makeFingerprint,
  mergeSignalsLatestPerRule,
} from './handler';
import type { SignalEntry } from '@kbn/significant-events-schema';

const successfulBulkCreate = async (documents: object[]) => ({
  errors: false,
  items: documents.map(() => ({ create: { status: 201, result: 'created' } })),
});

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

const writeOne = async ({
  discoveryClient,
  input,
}: {
  discoveryClient: Parameters<typeof discoveryWriteBulkHandler>[0]['discoveryClient'];
  input: DiscoveryWriteInput;
}) => {
  const [result] = await discoveryWriteBulkHandler({ discoveryClient, inputs: [input] });
  if (result === undefined) {
    throw new Error('Expected one discovery write result');
  }
  return result;
};

describe('discoveryWriteBulkHandler with one item', () => {
  it('writes a new discovery and returns event_id', async () => {
    const discoveryClient = {
      findByEventId: jest.fn().mockResolvedValue({ hits: [] }),
      bulkCreate: jest.fn().mockImplementation(successfulBulkCreate),
    };

    const result = await writeOne({
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
      bulkCreate: jest.fn().mockImplementation(successfulBulkCreate),
    };

    const result = await writeOne({
      discoveryClient: discoveryClient as never,
      input: { ...baseInput, event_id: 'checkout-write-api-connection-refused' },
    });

    expect(result.event_id).toBe('checkout-write-api-connection-refused');
  });

  it('derives event_id from detection rule uuids in signals', async () => {
    const discoveryClient = {
      findByEventId: jest.fn().mockResolvedValue({ hits: [] }),
      bulkCreate: jest.fn().mockImplementation(successfulBulkCreate),
    };

    const signals = [createSignal('rule-uuid-1')];

    const result = await writeOne({
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

    const result = await writeOne({
      discoveryClient: discoveryClient as never,
      input: { ...baseInput, dedup_window: 'now-1h' },
    });

    expect(discoveryClient.findLatest).toHaveBeenCalledWith({ from: expect.any(String) });
    expect(discoveryClient.bulkCreate).not.toHaveBeenCalled();
    expect(result.written).toBe(false);
    if (result.written || result.reason !== 'duplicate_within_window') {
      throw new Error('Expected the discovery write to be skipped');
    }
    expect(result.skipped).toBe(true);
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

    const result = await writeOne({
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
      bulkCreate: jest.fn().mockImplementation(successfulBulkCreate),
    };

    const result = await writeOne({
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
      bulkCreate: jest.fn().mockImplementation(successfulBulkCreate),
    };

    const result = await writeOne({
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
      bulkCreate: jest.fn().mockImplementation(successfulBulkCreate),
    };

    const result = await writeOne({
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
      bulkCreate: jest.fn().mockImplementation(successfulBulkCreate),
    };

    const result = await writeOne({
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
      bulkCreate: jest.fn().mockImplementation(successfulBulkCreate),
    };

    const result = await writeOne({
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
      bulkCreate: jest.fn().mockImplementation(successfulBulkCreate),
    };

    const result = await writeOne({
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
      bulkCreate: jest.fn().mockImplementation(successfulBulkCreate),
    };

    await writeOne({
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
      bulkCreate: jest.fn().mockImplementation(successfulBulkCreate),
    };

    const result = await writeOne({
      discoveryClient: discoveryClient as never,
      input: baseInput,
    });

    expect(result.discovery_id).toBeDefined();
    expect(discoveryClient.bulkCreate.mock.calls[0][0][0].discovery_id).toBe(result.discovery_id);
  });

  it('sets discovered_at only for kind:discovery', async () => {
    const discoveryClient = {
      findByEventId: jest.fn().mockResolvedValue({ hits: [] }),
      bulkCreate: jest.fn().mockImplementation(successfulBulkCreate),
    };

    await writeOne({
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

describe('discoveryWriteBulkHandler — continuation snapshot merge', () => {
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
      bulkCreate: jest.fn().mockImplementation(successfulBulkCreate),
    };

    await writeOne({
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
      bulkCreate: jest.fn().mockImplementation(successfulBulkCreate),
    };

    await writeOne({
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
      bulkCreate: jest.fn().mockImplementation(successfulBulkCreate),
    };
    const signals = [
      createSignal('ruleA', { detection_id: 'detection-1' }),
      createSignal('ruleA', { detection_id: 'detection-2' }),
    ];

    await writeOne({
      discoveryClient: discoveryClient as never,
      input: {
        ...baseInput,
        kind: 'handled',
        event_id: 'otel__x-abc12345',
        previous_discovery_id: 'source-discovery-id',
        signals,
      },
    });

    expect(discoveryClient.findByEventId).not.toHaveBeenCalled();
    expect(discoveryClient.bulkCreate.mock.calls[0][0][0].signals).toEqual(signals);
    expect(discoveryClient.bulkCreate.mock.calls[0][0][0].previous_discovery_id).toBe(
      'source-discovery-id'
    );
  });

  it('does not fetch prior docs for a new-episode (auto event_id) write', async () => {
    const discoveryClient = {
      findByEventId: jest.fn().mockResolvedValue({ hits: [] }),
      bulkCreate: jest.fn().mockImplementation(successfulBulkCreate),
    };

    await writeOne({
      discoveryClient: discoveryClient as never,
      input: { ...baseInput, signals: [createSignal('ruleA')] },
    });

    // auto event_id → no merging; no dedup_window → findLatest not called either
    expect(discoveryClient.findByEventId).not.toHaveBeenCalled();
  });
});

describe('discoveryWriteBulkHandler', () => {
  it('rejects duplicate explicit event ids before reads or writes', async () => {
    const discoveryClient = {
      findLatest: jest.fn(),
      findByEventId: jest.fn(),
      bulkCreate: jest.fn(),
    };

    await expect(
      discoveryWriteBulkHandler({
        discoveryClient: discoveryClient as never,
        inputs: [
          { ...baseInput, event_id: 'duplicate' },
          { ...baseInput, event_id: 'duplicate' },
        ],
      })
    ).rejects.toMatchObject({ code: 'validation_error' });
    expect(discoveryClient.findLatest).not.toHaveBeenCalled();
    expect(discoveryClient.findByEventId).not.toHaveBeenCalled();
    expect(discoveryClient.bulkCreate).not.toHaveBeenCalled();
  });

  it('rejects duplicate eligible fingerprints before reads or writes', async () => {
    const discoveryClient = {
      findLatest: jest.fn(),
      findByEventId: jest.fn(),
      bulkCreate: jest.fn(),
    };

    await expect(
      discoveryWriteBulkHandler({
        discoveryClient: discoveryClient as never,
        inputs: [
          { ...baseInput, dedup_window: 'now-1h' },
          { ...baseInput, dedup_window: 'now-30m' },
        ],
      })
    ).rejects.toMatchObject({ code: 'validation_error' });
    expect(discoveryClient.findLatest).not.toHaveBeenCalled();
    expect(discoveryClient.bulkCreate).not.toHaveBeenCalled();
  });

  it('maps created response items around an existing duplicate', async () => {
    const existing = {
      ...baseInput,
      '@timestamp': new Date().toISOString(),
      discovery_id: 'existing-discovery',
      event_id: 'existing-event',
      processed: false,
    };
    const discoveryClient = {
      findLatest: jest.fn().mockResolvedValue({ hits: [existing] }),
      findByEventId: jest.fn(),
      bulkCreate: jest.fn().mockImplementation(successfulBulkCreate),
    };

    const results = await discoveryWriteBulkHandler({
      discoveryClient: discoveryClient as never,
      inputs: [
        { ...baseInput, dedup_window: 'now-1h' },
        { ...baseInput, kind: 'handled', event_id: 'handled-event' },
      ],
    });

    expect(discoveryClient.bulkCreate.mock.calls[0][0]).toHaveLength(1);
    expect(results[0]).toEqual(
      expect.objectContaining({
        index: 0,
        written: false,
        reason: 'duplicate_within_window',
      })
    );
    expect(results[1]).toEqual(
      expect.objectContaining({ index: 1, event_id: 'handled-event', written: true })
    );
  });

  it('uses the earliest cutoff scan while preserving each item dedup window', async () => {
    const fortyFiveMinutesAgo = new Date(Date.now() - 45 * 60 * 1000).toISOString();
    const discoveryClient = {
      findLatest: jest.fn().mockResolvedValue({
        hits: [
          {
            ...baseInput,
            '@timestamp': fortyFiveMinutesAgo,
            discovery_id: 'checkout-existing',
            event_id: 'checkout-event',
            processed: false,
          },
          {
            ...baseInput,
            stream_names: ['logs.payment'],
            '@timestamp': fortyFiveMinutesAgo,
            discovery_id: 'payment-existing',
            event_id: 'payment-event',
            processed: false,
          },
        ],
      }),
      findByEventId: jest.fn(),
      bulkCreate: jest.fn().mockImplementation(successfulBulkCreate),
    };

    const results = await discoveryWriteBulkHandler({
      discoveryClient: discoveryClient as never,
      inputs: [
        { ...baseInput, dedup_window: 'now-1h' },
        { ...baseInput, stream_names: ['logs.payment'], dedup_window: 'now-30m' },
      ],
    });

    const from = discoveryClient.findLatest.mock.calls[0][0].from;
    expect(Date.now() - Date.parse(from)).toBeGreaterThanOrEqual(59 * 60 * 1000);
    expect(results[0]).toEqual(
      expect.objectContaining({ written: false, reason: 'duplicate_within_window' })
    );
    expect(results[1]).toEqual(expect.objectContaining({ written: true }));
    expect(discoveryClient.bulkCreate.mock.calls[0][0]).toHaveLength(1);
  });

  it('does not issue a bulk request when every input is an existing duplicate', async () => {
    const now = new Date().toISOString();
    const discoveryClient = {
      findLatest: jest.fn().mockResolvedValue({
        hits: [
          {
            ...baseInput,
            '@timestamp': now,
            discovery_id: 'checkout-existing',
            event_id: 'checkout-event',
            processed: false,
          },
          {
            ...baseInput,
            stream_names: ['logs.payment'],
            '@timestamp': now,
            discovery_id: 'payment-existing',
            event_id: 'payment-event',
            processed: false,
          },
        ],
      }),
      findByEventId: jest.fn(),
      bulkCreate: jest.fn(),
    };

    const results = await discoveryWriteBulkHandler({
      discoveryClient: discoveryClient as never,
      inputs: [
        { ...baseInput, dedup_window: 'now-1h' },
        { ...baseInput, stream_names: ['logs.payment'], dedup_window: 'now-1h' },
      ],
    });

    expect(results).toEqual([
      expect.objectContaining({ written: false, reason: 'duplicate_within_window' }),
      expect.objectContaining({ written: false, reason: 'duplicate_within_window' }),
    ]);
    expect(discoveryClient.bulkCreate).not.toHaveBeenCalled();
  });

  it('returns aligned partial failures for created items', async () => {
    const discoveryClient = {
      findLatest: jest.fn(),
      findByEventId: jest.fn(),
      bulkCreate: jest.fn().mockResolvedValue({
        errors: true,
        items: [
          { create: { status: 201, result: 'created' } },
          { create: { status: 429, error: { type: 'rejected', reason: 'busy' } } },
        ],
      }),
    };

    const results = await discoveryWriteBulkHandler({
      discoveryClient: discoveryClient as never,
      inputs: [
        { ...baseInput, kind: 'handled', event_id: 'event-1' },
        { ...baseInput, kind: 'handled', event_id: 'event-2' },
      ],
    });

    expect(results[0]).toEqual(expect.objectContaining({ index: 0, written: true }));
    expect(results[1]).toEqual(
      expect.objectContaining({
        index: 1,
        event_id: 'event-2',
        written: false,
        reason: 'bulk_error',
        error: { type: 'rejected', reason: 'busy', status: 429 },
      })
    );
  });

  it('fetches continuation histories once per unique event in parallel', async () => {
    const discoveryClient = {
      findLatest: jest.fn(),
      findByEventId: jest.fn().mockResolvedValue({ hits: [] }),
      bulkCreate: jest.fn().mockImplementation(successfulBulkCreate),
    };

    await discoveryWriteBulkHandler({
      discoveryClient: discoveryClient as never,
      inputs: [
        { ...baseInput, event_id: 'event-1' },
        { ...baseInput, event_id: 'event-2' },
      ],
    });

    expect(discoveryClient.findByEventId).toHaveBeenCalledTimes(2);
    expect(discoveryClient.findByEventId).toHaveBeenCalledWith('event-1');
    expect(discoveryClient.findByEventId).toHaveBeenCalledWith('event-2');
    expect(discoveryClient.bulkCreate).toHaveBeenCalledTimes(1);
  });

  it('classifies response cardinality mismatch as outcome unknown', async () => {
    const discoveryClient = {
      findLatest: jest.fn(),
      findByEventId: jest.fn(),
      bulkCreate: jest.fn().mockResolvedValue({ errors: false, items: [] }),
    };

    await expect(
      discoveryWriteBulkHandler({
        discoveryClient: discoveryClient as never,
        inputs: [{ ...baseInput, kind: 'handled', event_id: 'event-1' }],
      })
    ).rejects.toMatchObject({ code: 'outcome_unknown' });
  });

  it('classifies a rejected bulk request as outcome unknown', async () => {
    const discoveryClient = {
      findLatest: jest.fn(),
      findByEventId: jest.fn(),
      bulkCreate: jest.fn().mockRejectedValue(new Error('connection reset')),
    };

    await expect(
      discoveryWriteBulkHandler({
        discoveryClient: discoveryClient as never,
        inputs: [{ ...baseInput, kind: 'handled', event_id: 'event-1' }],
      })
    ).rejects.toMatchObject({ code: 'outcome_unknown' });
  });
});
