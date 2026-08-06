/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  eventsWriteBulkHandler,
  eventsWriteHandler,
  makeFingerprint,
  mergeSignalsLatestPerRule,
  mergeEpisodeContext,
  type EventsWriteInput,
} from './handler';
import type { SignalEntry, BlastRadiusEntry, CausalFeature } from '@kbn/significant-events-schema';
import {
  MAX_ASSESSMENT_NOTE_LENGTH,
  MAX_SIGNAL_DESCRIPTION_LENGTH,
  MAX_SUMMARY_LENGTH,
  MAX_SYMPTOM_HYPOTHESIS_LENGTH,
} from '@kbn/significant-events-schema';
import { eventsWriteItemSchema } from './tool';

const successfulBulkCreate = async (documents: object[]) => ({
  errors: false,
  items: documents.map(() => ({ create: { status: 201, result: 'created' } })),
});

const noopFindByEventId = jest.fn().mockResolvedValue({ hits: [] });
const noopFindLatestActive = jest.fn().mockResolvedValue({ hits: [] });

const TS_EARLIER = '2024-01-01T00:00:00.000Z';
const TS_SUBMITTED = '2024-01-02T00:00:00.000Z';
const TS_LATER = '2024-01-03T00:00:00.000Z';

const baseInput: EventsWriteInput = {
  status: 'open',
  stream_names: ['logs.checkout'],
  title: 'Checkout latency',
  symptom_hypothesis: 'Checkout requests are delayed because the payment dependency is timing out.',
  summary: 'P99 latency breached SLO',
  severity: '60-high',
  confidence: 0.82,
  assessment_note: 'Verified via execute_esql',
  signals: [],
  causal_features: [],
  blast_radius: [],
};

describe('eventsWriteHandler', () => {
  it('writes a new event', async () => {
    const eventClient = {
      findLatestActive: noopFindLatestActive,
      findLatestByEventIds: jest.fn().mockResolvedValue(new Map()),
      findByEventId: noopFindByEventId,
      bulkCreate: jest.fn().mockImplementation(successfulBulkCreate),
    };

    const result = await eventsWriteHandler({
      eventClient: eventClient as never,
      input: { ...baseInput, event_id: 'checkout__latency-abc12345' },
    });

    expect(eventClient.bulkCreate).toHaveBeenCalledTimes(1);
    expect(eventClient.bulkCreate.mock.calls[0][0][0].symptom_hypothesis).toBe(
      baseInput.symptom_hypothesis
    );
    expect(result.written).toBe(true);
    expect(result.event_id).toBe('checkout__latency-abc12345');
    expect(result.status).toBe('open');
    expect(typeof result.event_uuid).toBe('string');
  });

  it('skips latest-version lookup when event_id is absent', async () => {
    const eventClient = {
      findLatestActive: noopFindLatestActive,
      findLatestByEventIds: jest.fn(),
      findByEventId: jest.fn(),
      bulkCreate: jest.fn().mockImplementation(successfulBulkCreate),
    };

    const result = await eventsWriteHandler({
      eventClient: eventClient as never,
      input: { ...baseInput },
    });

    expect(eventClient.findLatestByEventIds).not.toHaveBeenCalled();
    expect(eventClient.findByEventId).not.toHaveBeenCalled();
    expect(result.written).toBe(true);
    expect(result.event_id).toMatch(/^agent-event-[a-f0-9]{8}$/);
  });

  it('treats an empty event_id as absent and generates a synthetic ID', async () => {
    const eventClient = {
      findLatestByEventIds: jest.fn(),
      bulkCreate: jest.fn().mockImplementation(successfulBulkCreate),
    };

    const result = await eventsWriteHandler({
      eventClient: eventClient as never,
      input: { ...baseInput, event_id: '' },
    });

    expect(eventClient.findLatestByEventIds).not.toHaveBeenCalled();
    expect(result.event_id).toMatch(/^agent-event-[a-f0-9]{8}$/);
    expect(eventClient.bulkCreate.mock.calls[0][0][0].event_id).toBe(result.event_id);
  });

  it('sets previous_event_uuid from the latest event returned by findLatestByEventIds', async () => {
    const eventClient = {
      findLatestActive: noopFindLatestActive,
      findLatestByEventIds: jest
        .fn()
        .mockResolvedValue(
          new Map([['checkout__latency-abc12345', { event_uuid: 'latest-id', status: 'closed' }]])
        ),
      findByEventId: noopFindByEventId,
      bulkCreate: jest.fn().mockImplementation(successfulBulkCreate),
    };

    const result = await eventsWriteHandler({
      eventClient: eventClient as never,
      input: { ...baseInput, event_id: 'checkout__latency-abc12345', status: 'open' },
    });

    expect(eventClient.bulkCreate).toHaveBeenCalledTimes(1);
    const written = eventClient.bulkCreate.mock.calls[0][0][0];
    expect(written.previous_event_uuid).toBe('latest-id');
    expect(result.written).toBe(true);
  });

  it('writes with refresh wait_for so an immediate discovery _count can see the event', async () => {
    const eventClient = {
      findLatestActive: noopFindLatestActive,
      findLatestByEventIds: jest.fn().mockResolvedValue(new Map()),
      findByEventId: noopFindByEventId,
      bulkCreate: jest.fn().mockImplementation(successfulBulkCreate),
    };

    await eventsWriteHandler({
      eventClient: eventClient as never,
      input: { ...baseInput, event_id: 'checkout__latency-abc12345' },
    });

    expect(eventClient.bulkCreate.mock.calls[0][1]).toEqual({
      throwOnFail: false,
      refresh: 'wait_for',
    });
  });

  it('carries the investigations lineage forward from the latest event on re-open', async () => {
    const investigations = [
      { workflow_execution_id: 'wf-1', started_at: '2024-01-01T00:00:00.000Z' },
    ];
    const eventClient = {
      findLatestActive: noopFindLatestActive,
      findLatestByEventIds: jest
        .fn()
        .mockResolvedValue(
          new Map([['checkout__latency-abc12345', { event_uuid: 'latest-id', investigations }]])
        ),
      findByEventId: noopFindByEventId,
      bulkCreate: jest.fn().mockImplementation(successfulBulkCreate),
    };

    await eventsWriteHandler({
      eventClient: eventClient as never,
      input: { ...baseInput, event_id: 'checkout__latency-abc12345' },
    });

    const written = eventClient.bulkCreate.mock.calls[0][0][0];
    expect(written.investigations).toEqual(investigations);
  });

  it('leaves investigations undefined when the latest event has none', async () => {
    const eventClient = {
      findLatestActive: noopFindLatestActive,
      findLatestByEventIds: jest
        .fn()
        .mockResolvedValue(new Map([['checkout__latency-abc12345', { event_uuid: 'latest-id' }]])),
      findByEventId: noopFindByEventId,
      bulkCreate: jest.fn().mockImplementation(successfulBulkCreate),
    };

    await eventsWriteHandler({
      eventClient: eventClient as never,
      input: { ...baseInput, event_id: 'checkout__latency-abc12345' },
    });

    const written = eventClient.bulkCreate.mock.calls[0][0][0];
    expect(written.investigations).toBeUndefined();
  });
});

describe('eventsWriteBulkHandler', () => {
  it('writes unique event ids with one lookup and one bulk request', async () => {
    const eventClient = {
      findLatestActive: noopFindLatestActive,
      findLatestByEventIds: jest.fn().mockResolvedValue(new Map()),
      findByEventId: noopFindByEventId,
      bulkCreate: jest.fn().mockImplementation(successfulBulkCreate),
    };

    const results = await eventsWriteBulkHandler({
      eventClient: eventClient as never,
      inputs: [
        { ...baseInput, event_id: 'event-1' },
        { ...baseInput, event_id: 'event-2', status: 'closed' },
      ],
    });

    expect(eventClient.findLatestByEventIds).toHaveBeenCalledWith(['event-1', 'event-2']);
    expect(eventClient.bulkCreate).toHaveBeenCalledTimes(1);
    expect(eventClient.bulkCreate.mock.calls[0][0]).toHaveLength(2);
    expect(results).toEqual([
      expect.objectContaining({ index: 0, event_id: 'event-1', written: true }),
      expect.objectContaining({ index: 1, event_id: 'event-2', written: true }),
    ]);
  });

  it('returns aligned per-item bulk failures', async () => {
    const eventClient = {
      findLatestActive: noopFindLatestActive,
      findLatestByEventIds: jest.fn().mockResolvedValue(new Map()),
      findByEventId: noopFindByEventId,
      bulkCreate: jest.fn().mockResolvedValue({
        errors: true,
        items: [
          { create: { status: 201, result: 'created' } },
          {
            create: {
              status: 400,
              error: { type: 'mapper_parsing_exception', reason: 'bad field' },
            },
          },
        ],
      }),
    };

    const results = await eventsWriteBulkHandler({
      eventClient: eventClient as never,
      inputs: [
        { ...baseInput, event_id: 'event-1' },
        { ...baseInput, event_id: 'event-2' },
      ],
    });

    expect(results[0]).toEqual(expect.objectContaining({ index: 0, written: true }));
    expect(results[1]).toEqual({
      index: 1,
      event_id: 'event-2',
      status: 'open',
      written: false,
      reason: 'bulk_error',
      error: { type: 'mapper_parsing_exception', reason: 'bad field', status: 400 },
    });
  });

  it('returns per-item errors for duplicate event_ids without throwing', async () => {
    const eventClient = {
      findLatestActive: noopFindLatestActive,
      findLatestByEventIds: jest.fn().mockResolvedValue(new Map()),
      findByEventId: noopFindByEventId,
      bulkCreate: jest.fn().mockResolvedValue({
        errors: false,
        items: [{ create: { result: 'created', _id: 'doc-1', status: 201 } }],
      }),
    };

    const results = await eventsWriteBulkHandler({
      eventClient: eventClient as never,
      inputs: [
        { ...baseInput, event_id: 'duplicate' },
        { ...baseInput, event_id: 'duplicate' },
      ],
    });

    expect(results[0]).toEqual(expect.objectContaining({ index: 0, written: true }));
    expect(results[1]).toEqual(
      expect.objectContaining({ index: 1, written: false, reason: 'duplicate_key' })
    );
    expect(eventClient.bulkCreate).toHaveBeenCalledTimes(1);
  });

  it('rejects an item with both event_id and dedup_window as a validation error', async () => {
    const eventClient = {
      findLatestActive: jest.fn(),
      findLatestByEventIds: jest.fn(),
      findByEventId: jest.fn(),
      bulkCreate: jest.fn(),
    };

    await expect(
      eventsWriteBulkHandler({
        eventClient: eventClient as never,
        inputs: [{ ...baseInput, event_id: 'event-1', dedup_window: 'now-24h' }],
      })
    ).rejects.toMatchObject({ code: 'validation_error' });
    expect(eventClient.findLatestActive).not.toHaveBeenCalled();
    expect(eventClient.bulkCreate).not.toHaveBeenCalled();
  });

  it('classifies a response cardinality mismatch as outcome unknown', async () => {
    const eventClient = {
      findLatestActive: noopFindLatestActive,
      findLatestByEventIds: jest.fn().mockResolvedValue(new Map()),
      findByEventId: noopFindByEventId,
      bulkCreate: jest.fn().mockResolvedValue({ errors: false, items: [] }),
    };

    await expect(
      eventsWriteBulkHandler({
        eventClient: eventClient as never,
        inputs: [{ ...baseInput, event_id: 'event-1' }],
      })
    ).rejects.toMatchObject({ code: 'outcome_unknown' });
  });

  it('classifies a response without a create result as outcome unknown', async () => {
    const eventClient = {
      findLatestActive: noopFindLatestActive,
      findLatestByEventIds: jest.fn().mockResolvedValue(new Map()),
      findByEventId: noopFindByEventId,
      bulkCreate: jest.fn().mockResolvedValue({ errors: false, items: [{}] }),
    };

    await expect(
      eventsWriteBulkHandler({
        eventClient: eventClient as never,
        inputs: [{ ...baseInput, event_id: 'event-1' }],
      })
    ).rejects.toMatchObject({ code: 'outcome_unknown' });
  });

  it('classifies a rejected bulk request as outcome unknown', async () => {
    const eventClient = {
      findLatestActive: noopFindLatestActive,
      findLatestByEventIds: jest.fn().mockResolvedValue(new Map()),
      findByEventId: noopFindByEventId,
      bulkCreate: jest.fn().mockRejectedValue(new Error('connection reset')),
    };

    await expect(
      eventsWriteBulkHandler({
        eventClient: eventClient as never,
        inputs: [{ ...baseInput, event_id: 'event-1' }],
      })
    ).rejects.toMatchObject({ code: 'outcome_unknown' });
  });

  it('keeps the single-item wrapper throwing on an item failure', async () => {
    const eventClient = {
      findLatestActive: noopFindLatestActive,
      findLatestByEventIds: jest.fn().mockResolvedValue(new Map()),
      findByEventId: noopFindByEventId,
      bulkCreate: jest.fn().mockResolvedValue({
        errors: true,
        items: [
          { create: { status: 400, error: { type: 'mapper_parsing_exception', reason: 'bad' } } },
        ],
      }),
    };

    await expect(
      eventsWriteHandler({
        eventClient: eventClient as never,
        input: { ...baseInput, event_id: 'event-1' },
      })
    ).rejects.toThrow('mapper_parsing_exception: bad');
  });
});

describe('makeFingerprint', () => {
  it('is stable regardless of stream and rule ordering', () => {
    const a = makeFingerprint(['logs.b', 'logs.a'], ['rule-2', 'rule-1']);
    const b = makeFingerprint(['logs.a', 'logs.b'], ['rule-1', 'rule-2']);
    expect(a).toBe(b);
  });

  it('uses only the lexicographically first stream (primary)', () => {
    const onePrimary = makeFingerprint(['logs.a'], ['rule-1']);
    const withExtra = makeFingerprint(['logs.a', 'logs.z'], ['rule-1']);
    expect(onePrimary).toBe(withExtra);
  });

  it('produces different fingerprints for different rule sets', () => {
    const a = makeFingerprint(['logs.app'], ['rule-1']);
    const b = makeFingerprint(['logs.app'], ['rule-2']);
    expect(a).not.toBe(b);
  });

  it('falls back to "unknown" primary stream when stream_names is empty', () => {
    expect(() => makeFingerprint([], ['rule-1'])).not.toThrow();
    const fp = makeFingerprint([], ['rule-1']);
    expect(fp).toContain('unknown');
  });
});

describe('mergeSignalsLatestPerRule', () => {
  const makeSignal = (ruleUuid: string): SignalEntry => ({
    type: 'detection',
    stream_name: 'logs.test',
    description: 'Test signal',
    confirmed: true,
    metadata: {
      detection_id: `det-${ruleUuid}`,
      rule_uuid: ruleUuid,
      change_point_type: 'spike',
      p_value: 0.01,
    },
  });

  it('keeps the submitted signal when no prior docs exist', () => {
    const signal = makeSignal('rule-1');
    const result = mergeSignalsLatestPerRule([], [signal], TS_SUBMITTED);
    expect(result).toEqual([signal]);
  });

  it('uses the most recent version of a signal per rule_uuid — submitted wins when newer', () => {
    const priorSignal = makeSignal('rule-1');
    const submittedSignal = makeSignal('rule-1');
    const priorDocs = [{ '@timestamp': TS_EARLIER, signals: [priorSignal] }];
    const result = mergeSignalsLatestPerRule(priorDocs, [submittedSignal], TS_SUBMITTED);
    expect(result).toHaveLength(1);
    // submitted wins — its detection_id matches the submitted signal
    expect((result[0] as SignalEntry & { type: 'detection' }).metadata.detection_id).toBe(
      submittedSignal.metadata.detection_id
    );
  });

  it('carries forward prior rules that are absent in the submitted batch', () => {
    const rule1 = makeSignal('rule-1');
    const rule2 = makeSignal('rule-2');
    const priorDocs = [{ '@timestamp': TS_EARLIER, signals: [rule1] }];
    const result = mergeSignalsLatestPerRule(priorDocs, [rule2], TS_SUBMITTED);
    expect(result).toHaveLength(2);
    const ruleUuids = result.map(
      (s) => (s as Extract<SignalEntry, { type: 'detection' }>).metadata.rule_uuid
    );
    expect(ruleUuids).toContain('rule-1');
    expect(ruleUuids).toContain('rule-2');
  });

  it('prefers prior doc when its timestamp is newer than submitted', () => {
    const priorSignal = makeSignal('rule-1');
    const submittedSignal = makeSignal('rule-1');
    const priorDocs = [{ '@timestamp': TS_LATER, signals: [priorSignal] }];
    const result = mergeSignalsLatestPerRule(priorDocs, [submittedSignal], TS_EARLIER);
    expect((result[0] as Extract<SignalEntry, { type: 'detection' }>).metadata.detection_id).toBe(
      priorSignal.metadata.detection_id
    );
  });
});

describe('mergeEpisodeContext', () => {
  const makeCausal = (featureId: string): CausalFeature => ({
    feature_id: featureId,
    name: featureId,
  });
  const makeBlast = (featureId: string): BlastRadiusEntry => ({
    type: 'entity',
    feature_id: featureId,
    name: featureId,
    stream_name: 'logs.test',
  });

  it('unions stream_names across all docs and sorts them', () => {
    const priorDocs = [{ '@timestamp': TS_EARLIER, stream_names: ['logs.b'] }];
    const { streamNames } = mergeEpisodeContext(
      priorDocs,
      { stream_names: ['logs.a'], causal_features: [], blast_radius: [] },
      TS_SUBMITTED
    );
    expect(streamNames).toEqual(['logs.a', 'logs.b']);
  });

  it('causal classification beats blast for the same feature_id', () => {
    const priorDocs = [
      {
        '@timestamp': TS_EARLIER,
        stream_names: ['logs.app'],
        blast_radius: [makeBlast('feat-1')],
        causal_features: [] as CausalFeature[],
      },
    ];
    const { causalFeatures, blastRadius } = mergeEpisodeContext(
      priorDocs,
      {
        stream_names: ['logs.app'],
        causal_features: [makeCausal('feat-1')],
        blast_radius: [],
      },
      TS_SUBMITTED
    );
    expect(causalFeatures.map((f) => f.feature_id)).toContain('feat-1');
    expect(blastRadius.map((f) => f.feature_id)).not.toContain('feat-1');
  });

  it('keeps the most recent version of a blast_radius entry per feature_id', () => {
    const older = makeBlast('feat-1');
    const newer = makeBlast('feat-1');
    const priorDocs = [
      {
        '@timestamp': TS_EARLIER,
        stream_names: ['logs.app'],
        blast_radius: [older],
        causal_features: [] as CausalFeature[],
      },
    ];
    const { blastRadius } = mergeEpisodeContext(
      priorDocs,
      { stream_names: ['logs.app'], causal_features: [], blast_radius: [newer] },
      TS_SUBMITTED
    );
    expect(blastRadius).toHaveLength(1);
    expect(blastRadius[0].feature_id).toBe('feat-1');
  });
});

describe('eventsWriteBulkHandler — dedup mode', () => {
  const dedupInput: EventsWriteInput = {
    ...baseInput,
    status: 'open' as const,
    stream_names: ['logs.checkout'],
    signals: [
      {
        type: 'detection',
        metadata: { rule_uuid: 'rule-abc', rule_name: 'High Latency' },
        confirmed: true,
      } as never,
    ],
    dedup_window: 'now-24h',
  };

  const makeDedupInputWithChangePointType = (
    changePointType: string | undefined
  ): EventsWriteInput => ({
    ...dedupInput,
    signals: [
      {
        type: 'detection',
        metadata: {
          rule_uuid: 'rule-abc',
          rule_name: 'High Latency',
          ...(changePointType !== undefined ? { change_point_type: changePointType } : {}),
        },
        confirmed: true,
      } as never,
    ],
  });

  it('skips write and returns existing event_id when an active duplicate is found in window', async () => {
    const existingEvent = {
      event_id: 'existing-event-id',
      event_uuid: 'existing-uuid',
      status: 'open',
      '@timestamp': new Date().toISOString(),
      stream_names: ['logs.checkout'],
      signals: dedupInput.signals,
    };

    const eventClient = {
      findLatestActive: jest.fn().mockResolvedValue({ hits: [existingEvent] }),
      findLatestByEventIds: jest.fn().mockResolvedValue(new Map()),
      findByEventId: noopFindByEventId,
      bulkCreate: jest.fn(),
    };

    const results = await eventsWriteBulkHandler({
      eventClient: eventClient as never,
      inputs: [dedupInput],
    });

    expect(results[0]).toMatchObject({
      index: 0,
      written: false,
      skipped: true,
      reason: 'duplicate_within_window',
      event_id: 'existing-event-id',
      existing_event_id: 'existing-event-id',
    });
    expect(eventClient.bulkCreate).not.toHaveBeenCalled();
  });

  it('does not skip when the candidate has a different change_point_type for the same rule', async () => {
    const existingEvent = {
      event_id: 'existing-event-id',
      event_uuid: 'existing-uuid',
      status: 'open',
      '@timestamp': new Date().toISOString(),
      stream_names: ['logs.checkout'],
      signals: [
        {
          type: 'detection',
          metadata: {
            rule_uuid: 'rule-abc',
            rule_name: 'High Latency',
            change_point_type: 'spike',
          },
          confirmed: true,
        } as never,
      ],
    };

    const eventClient = {
      findLatestActive: jest.fn().mockResolvedValue({ hits: [existingEvent] }),
      findLatestByEventIds: jest.fn().mockResolvedValue(new Map()),
      findByEventId: noopFindByEventId,
      bulkCreate: jest.fn().mockImplementation(successfulBulkCreate),
    };

    // Submitted with a dip for the same rule — different change_point_type → bypass dedup
    const results = await eventsWriteBulkHandler({
      eventClient: eventClient as never,
      inputs: [
        {
          ...dedupInput,
          signals: [
            {
              type: 'detection',
              metadata: {
                rule_uuid: 'rule-abc',
                rule_name: 'High Latency',
                change_point_type: 'dip',
              },
              confirmed: true,
            } as never,
          ],
        },
      ],
    });

    expect(results[0]).toMatchObject({ index: 0, written: true });
    expect(eventClient.bulkCreate).toHaveBeenCalledTimes(1);
  });

  it('does not skip when the matching event is older than the dedup window', async () => {
    const oldEvent = {
      event_id: 'old-event-id',
      status: 'open',
      '@timestamp': '2000-01-01T00:00:00.000Z',
      stream_names: ['logs.checkout'],
      signals: dedupInput.signals,
    };

    const eventClient = {
      findLatestActive: jest.fn().mockResolvedValue({ hits: [oldEvent] }),
      findLatestByEventIds: jest.fn().mockResolvedValue(new Map()),
      findByEventId: noopFindByEventId,
      bulkCreate: jest.fn().mockImplementation(successfulBulkCreate),
    };

    const results = await eventsWriteBulkHandler({
      eventClient: eventClient as never,
      inputs: [dedupInput],
    });

    expect(results[0]).toMatchObject({ index: 0, written: true });
    expect(eventClient.bulkCreate).toHaveBeenCalledTimes(1);
  });

  it('returns duplicate_key error for a second in-batch item with the same fingerprint', async () => {
    const eventClient = {
      findLatestActive: jest.fn().mockResolvedValue({ hits: [] }),
      findLatestByEventIds: jest.fn().mockResolvedValue(new Map()),
      findByEventId: noopFindByEventId,
      bulkCreate: jest.fn().mockImplementation(successfulBulkCreate),
    };

    const results = await eventsWriteBulkHandler({
      eventClient: eventClient as never,
      inputs: [dedupInput, { ...dedupInput }],
    });

    expect(results[0]).toMatchObject({ index: 0, written: true });
    expect(results[1]).toMatchObject({ index: 1, written: false, reason: 'duplicate_key' });
    // Only one item should have been written.
    expect(eventClient.bulkCreate.mock.calls[0][0]).toHaveLength(1);
  });

  it('writes both in-batch items when they share a fingerprint but differ in change_point_type', async () => {
    const eventClient = {
      findLatestActive: jest.fn().mockResolvedValue({ hits: [] }),
      findLatestByEventIds: jest.fn().mockResolvedValue(new Map()),
      findByEventId: noopFindByEventId,
      bulkCreate: jest.fn().mockImplementation(successfulBulkCreate),
    };

    const results = await eventsWriteBulkHandler({
      eventClient: eventClient as never,
      inputs: [
        makeDedupInputWithChangePointType('spike'),
        makeDedupInputWithChangePointType('dip'),
      ],
    });

    expect(results[0]).toMatchObject({ index: 0, written: true });
    expect(results[1]).toMatchObject({ index: 1, written: true });
    expect(eventClient.bulkCreate.mock.calls[0][0]).toHaveLength(2);
  });

  it('deduplicates a later in-batch item against an earlier one with the same change_point_type', async () => {
    const spikeInput = makeDedupInputWithChangePointType('spike');

    const eventClient = {
      findLatestActive: jest.fn().mockResolvedValue({ hits: [] }),
      findLatestByEventIds: jest.fn().mockResolvedValue(new Map()),
      findByEventId: noopFindByEventId,
      bulkCreate: jest.fn().mockImplementation(successfulBulkCreate),
    };

    const results = await eventsWriteBulkHandler({
      eventClient: eventClient as never,
      inputs: [spikeInput, makeDedupInputWithChangePointType('dip'), { ...spikeInput }],
    });

    expect(results[0]).toMatchObject({ index: 0, written: true });
    expect(results[1]).toMatchObject({ index: 1, written: true });
    expect(results[2]).toMatchObject({ index: 2, written: false, reason: 'duplicate_key' });
    expect(eventClient.bulkCreate.mock.calls[0][0]).toHaveLength(2);
  });

  it('writes both in-batch items when change_point_type is omitted on one and explicit on the other', async () => {
    const eventClient = {
      findLatestActive: jest.fn().mockResolvedValue({ hits: [] }),
      findLatestByEventIds: jest.fn().mockResolvedValue(new Map()),
      findByEventId: noopFindByEventId,
      bulkCreate: jest.fn().mockImplementation(successfulBulkCreate),
    };

    const results = await eventsWriteBulkHandler({
      eventClient: eventClient as never,
      inputs: [
        makeDedupInputWithChangePointType(undefined),
        makeDedupInputWithChangePointType('spike'),
      ],
    });

    expect(results[0]).toMatchObject({ index: 0, written: true });
    expect(results[1]).toMatchObject({ index: 1, written: true });
    expect(eventClient.bulkCreate.mock.calls[0][0]).toHaveLength(2);
  });

  it('uses only one findLatestActive scan for multiple dedup candidates', async () => {
    const dedupInput2: EventsWriteInput = {
      ...dedupInput,
      stream_names: ['logs.payments'],
    };

    const eventClient = {
      findLatestActive: jest.fn().mockResolvedValue({ hits: [] }),
      findLatestByEventIds: jest.fn().mockResolvedValue(new Map()),
      findByEventId: noopFindByEventId,
      bulkCreate: jest.fn().mockImplementation(successfulBulkCreate),
    };

    await eventsWriteBulkHandler({
      eventClient: eventClient as never,
      inputs: [dedupInput, dedupInput2],
    });

    expect(eventClient.findLatestActive).toHaveBeenCalledTimes(1);
    expect(eventClient.findLatestActive).toHaveBeenCalledWith(
      expect.objectContaining({
        streamNames: ['logs.checkout', 'logs.payments'],
        ruleUuids: ['rule-abc'],
      })
    );
  });

  it.each<{ field: 'ruleUuids' | 'streamNames'; override: Partial<EventsWriteInput> }>([
    { field: 'ruleUuids', override: { stream_names: ['logs.payments'], signals: [] } },
    { field: 'streamNames', override: { stream_names: [] } },
  ])(
    'omits $field from the scan when any candidate in the batch has none',
    async ({ field, override }) => {
      const partialInput: EventsWriteInput = { ...dedupInput, ...override };

      const eventClient = {
        findLatestActive: jest.fn().mockResolvedValue({ hits: [] }),
        findLatestByEventIds: jest.fn().mockResolvedValue(new Map()),
        findByEventId: noopFindByEventId,
        bulkCreate: jest.fn().mockImplementation(successfulBulkCreate),
      };

      await eventsWriteBulkHandler({
        eventClient: eventClient as never,
        inputs: [dedupInput, partialInput],
      });

      expect(eventClient.findLatestActive).toHaveBeenCalledWith(
        expect.objectContaining({ [field]: undefined })
      );
    }
  );

  it('deduplicates when the stored episode has a wider stream set than the candidate', async () => {
    const existingEvent = {
      event_id: 'existing-event-id',
      event_uuid: 'existing-uuid',
      status: 'open',
      '@timestamp': new Date().toISOString(),
      stream_names: ['logs.checkout', 'logs.payments'],
      signals: dedupInput.signals,
    };

    const eventClient = {
      findLatestActive: jest.fn().mockResolvedValue({ hits: [existingEvent] }),
      findLatestByEventIds: jest.fn().mockResolvedValue(new Map()),
      findByEventId: noopFindByEventId,
      bulkCreate: jest.fn(),
    };

    const results = await eventsWriteBulkHandler({
      eventClient: eventClient as never,
      inputs: [{ ...dedupInput, stream_names: ['logs.payments'] }],
    });

    expect(results[0]).toMatchObject({
      written: false,
      skipped: true,
      reason: 'duplicate_within_window',
    });
    expect(eventClient.bulkCreate).not.toHaveBeenCalled();
  });

  it('treats omitted and empty change_point_type as equivalent for window dedup', async () => {
    const existingEvent = {
      event_id: 'existing-event-id',
      event_uuid: 'existing-uuid',
      status: 'open',
      '@timestamp': new Date().toISOString(),
      stream_names: ['logs.checkout'],
      signals: [
        {
          type: 'detection',
          metadata: { rule_uuid: 'rule-abc', rule_name: 'High Latency', change_point_type: '' },
          confirmed: true,
        } as never,
      ],
    };

    const eventClient = {
      findLatestActive: jest.fn().mockResolvedValue({ hits: [existingEvent] }),
      findLatestByEventIds: jest.fn().mockResolvedValue(new Map()),
      findByEventId: noopFindByEventId,
      bulkCreate: jest.fn(),
    };

    const results = await eventsWriteBulkHandler({
      eventClient: eventClient as never,
      inputs: [makeDedupInputWithChangePointType(undefined)],
    });

    expect(results[0]).toMatchObject({
      written: false,
      skipped: true,
      reason: 'duplicate_within_window',
    });
    expect(eventClient.bulkCreate).not.toHaveBeenCalled();
  });
});

describe('eventsWriteBulkHandler — continuation status', () => {
  it('persists open status sent by discovery on an open continuation', async () => {
    const priorOpen = {
      '@timestamp': TS_EARLIER,
      event_uuid: 'prior-uuid',
      event_id: 'checkout-open',
      status: 'open' as const,
      stream_names: ['logs.checkout'],
      signals: baseInput.signals,
    };

    const eventClient = {
      findLatestActive: noopFindLatestActive,
      findLatestByEventIds: jest
        .fn()
        .mockResolvedValue(new Map([['checkout-open', priorOpen as never]])),
      findByEventId: jest.fn().mockResolvedValue({ hits: [priorOpen] }),
      bulkCreate: jest.fn().mockImplementation(successfulBulkCreate),
    };

    const results = await eventsWriteBulkHandler({
      eventClient: eventClient as never,
      inputs: [
        {
          ...baseInput,
          event_id: 'checkout-open',
          status: 'open',
        },
      ],
    });

    expect(results[0]).toMatchObject({ written: true, status: 'open' });
    expect(eventClient.bulkCreate.mock.calls[0][0][0].status).toBe('open');
  });

  it('persists closed status sent by discovery on a closed continuation', async () => {
    const priorClosed = {
      '@timestamp': TS_EARLIER,
      event_uuid: 'prior-uuid',
      event_id: 'checkout-closed',
      status: 'closed' as const,
      stream_names: ['logs.checkout'],
      signals: baseInput.signals,
    };

    const eventClient = {
      findLatestActive: noopFindLatestActive,
      findLatestByEventIds: jest
        .fn()
        .mockResolvedValue(new Map([['checkout-closed', priorClosed as never]])),
      findByEventId: jest.fn().mockResolvedValue({ hits: [priorClosed] }),
      bulkCreate: jest.fn().mockImplementation(successfulBulkCreate),
    };

    const results = await eventsWriteBulkHandler({
      eventClient: eventClient as never,
      inputs: [
        {
          ...baseInput,
          event_id: 'checkout-closed',
          status: 'closed',
        },
      ],
    });

    expect(results[0]).toMatchObject({ written: true, status: 'closed' });
    expect(eventClient.bulkCreate.mock.calls[0][0][0].status).toBe('closed');
  });
});

describe('eventsWriteItemSchema', () => {
  const validItem = {
    ...baseInput,
    signals: [
      {
        type: 'detection',
        stream_name: 'logs.test',
        description: 'x'.repeat(MAX_SIGNAL_DESCRIPTION_LENGTH),
        metadata: {
          detection_id: 'det-1',
          rule_uuid: 'rule-1',
          change_point_type: 'spike',
          p_value: 0.01,
        },
      },
    ],
  };

  it('accepts signal descriptions at the 350-char limit', () => {
    expect(eventsWriteItemSchema.safeParse(validItem).success).toBe(true);
  });

  it('rejects signal descriptions exceeding the 350-char limit', () => {
    const result = eventsWriteItemSchema.safeParse({
      ...validItem,
      signals: [
        {
          ...validItem.signals[0],
          description: 'x'.repeat(MAX_SIGNAL_DESCRIPTION_LENGTH + 1),
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects symptom hypotheses exceeding the agent input limit', () => {
    const result = eventsWriteItemSchema.safeParse({
      ...validItem,
      symptom_hypothesis: 'x'.repeat(MAX_SYMPTOM_HYPOTHESIS_LENGTH + 1),
    });

    expect(result.success).toBe(false);
  });

  it('rejects summaries exceeding the agent input limit', () => {
    const result = eventsWriteItemSchema.safeParse({
      ...validItem,
      summary: 'x'.repeat(MAX_SUMMARY_LENGTH + 1),
    });

    expect(result.success).toBe(false);
  });

  it('rejects assessment notes exceeding the agent input limit', () => {
    const result = eventsWriteItemSchema.safeParse({
      ...validItem,
      assessment_note: 'x'.repeat(MAX_ASSESSMENT_NOTE_LENGTH + 1),
    });

    expect(result.success).toBe(false);
  });
});
